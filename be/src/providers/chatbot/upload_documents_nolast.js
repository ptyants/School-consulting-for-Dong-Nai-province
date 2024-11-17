import { createClient } from '@supabase/supabase-js';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { Document } from '@langchain/core/documents';
import { writeFile } from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import fs from 'fs';
import { convertToSlug, getRandomID } from '../../utilities/func';
import { LOGO_DNTU, dataLink } from '../../utilities/constants';
import { uploadFilePdf, streamUploadMutiple } from '../cloudinary/index';

const getGoogleEmbeddings = async (texts, apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "embedding-001" });

    const embeddings = [];
    for (const text of texts) {
        try {
            const result = await model.embedContent(text);
            embeddings.push(result.embedding.values);
        } catch (error) {
            console.error(`Error embedding content: ${error.message}`);
            embeddings.push(null); // Push null for failed embeddings
        }
    }

    return embeddings;
};

const readBufferImagePromise = (_filePath, fileName) => {
    return new Promise((resolve, reject) => {
        fs.readFile(_filePath, (err, fileBuffer) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.warn(`File not found: ${_filePath}`);
                    resolve(null); // Resolve with null for non-existing files
                } else {
                    console.error('Error reading image file:', err);
                    reject(err);
                }
            } else {
                resolve({
                    origin_file_name: fileName,
                    buffer: fileBuffer
                });
            }
        });
    });
};

const processFileMD = async (_rootFolder, _folderName) => {
    return new Promise((resolve, reject) => {
        fs.readFile(`${_rootFolder}/${_folderName}/${_folderName}.md`, 'utf8', async (err, plainText) => {
            if (err) {
                console.error('Error reading Markdown file:', err);
                reject(err);
                return;
            }

            const regex = /!\[.*?\]\((?!https?:\/\/)(.*?\.(png|jpeg))\)/g;
            const filenames = [];

            let match;
            while ((match = regex.exec(plainText)) !== null) {
                filenames.push(match[1]);
            }

            let imageBufferArr = [];
            const promises = filenames.map(fileName => {
                const filePath = `${_rootFolder}/${_folderName}/${fileName}`;
                return readBufferImagePromise(filePath, fileName);
            });

            try {
                const results = await Promise.all(promises);
                imageBufferArr = results.filter(result => result !== null); // Filter out null values for non-existing files
            } catch (error) {
                console.error('Error processing image files:', error);
                reject(error);
                return;
            }

            const slugFolderName = convertToSlug(_folderName);
            const urlPdfImages = await streamUploadMutiple(imageBufferArr, {
                folder: 'PdfImages',
                resource_type: 'auto'
            });

            let plainTextClone = plainText;
            urlPdfImages.forEach(obj => {
                // Replace relative path with absolute URL
                const relativePath = `(${obj.origin_file_name})`;
                const absoluteUrl = `(${obj.url})`;
                plainTextClone = plainTextClone.replace(relativePath, absoluteUrl);
            });

            await writeFile(`src/documents/process_md/${_folderName}.md`, plainTextClone);

            const metaData = dataLink.find(i => i.title === _folderName);

            if (metaData) {
                resolve(new Document({
                    pageContent: plainTextClone,
                    metadata: {
                        id: metaData.id,
                        title: metaData.title,
                        link: metaData.url,
                        favicon: LOGO_DNTU,
                        snippet: metaData.title
                    }
                }));
            } else {
                const pdfUrlAndID = await uploadFilePdf(_folderName);
                resolve(new Document({
                    pageContent: plainTextClone,
                    metadata: {
                        id: pdfUrlAndID.id,
                        title: _folderName + '.pdf',
                        link: pdfUrlAndID.url,
                        favicon: LOGO_DNTU,
                        snippet: _folderName
                    }
                }));
            }
        });
    });
};

const chunkPromises = (promises, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < promises.length; i += chunkSize) {
        chunks.push(promises.slice(i, i + chunkSize));
    }
    return chunks;
};

export const uploadSingleDocMDToSupabase = async (data) => {
    const { chunkSize = 1000, chunkOverlap = 500 } = data;

    // Load all documents from a directory and split them into chunks
    const docLoader = new DirectoryLoader({ directory: 'src/documents' });
    const docSplitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });

    const documents = await docLoader.load();
    const chunks = docSplitter.split(documents);

    // Initialize Supabase client and vector store
    const supabase = createClient('https://your-supabase-url.com', 'your-supabase-key');
    const vectorStore = new SupabaseVectorStore(supabase);

    // Process each chunk of documents
    for (let chunk of chunks) {
        const embeddings = await getGoogleEmbeddings(chunk.map(doc => doc.pageContent), 'your-google-api-key');

        // Store embeddings in Supabase
        for (let i = 0; i < chunk.length; i++) {
            const doc = chunk[i];
            const embeddingValues = embeddings[i] || []; // Use empty array if embedding failed

            const { data, error } = await vectorStore.store(doc.metadata.id, embeddingValues);

            if (error) {
                console.error(`Error storing embedding for document ${doc.metadata.id}: ${error.message}`);
            } else {
                console.log(`Embedding stored successfully for document ${doc.metadata.id}`);
            }
        }
    }
};
