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
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
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
    const _rootFolder = 'src/documents/md';
    const chunkSizePromise = 5;
    const promises = [];
    let documents = [];

    await fs.readdirSync(_rootFolder).forEach(_folderName => {
        promises.push(processFileMD(_rootFolder, _folderName));
    });

    const chunks = chunkPromises(promises, chunkSizePromise);
    for (const chunk of chunks) {
        await Promise.all(chunk)
            .then(async results => {
                documents = documents.concat(results);
            })
            .catch(err => {
                console.error('Error processing documents:', err);
            });
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap
    });

    const splitDocs = await textSplitter.splitDocuments(documents);

    await writeFile('src/documents/upload/upload.txt', JSON.stringify(splitDocs));

    const sbApiKey = process.env.SUPABASE_API_KEY;
    const sbUrl = process.env.SUPABASE_URL_LC_CHATBOT;
    const googleApiKey = process.env.GEMINI_API_KEY; // Replace with actual Google Generative AI API key

    const texts = splitDocs.map(doc => doc.pageContent);
    const embeddings = await getGoogleEmbeddings(texts, googleApiKey);

    const client = createClient(sbUrl || '', sbApiKey || '');

    const result = await SupabaseVectorStore.fromEmbeddings(
        embeddings,
        splitDocs,
        {
            client,
            tableName: 'documents'
        }
    );
    console.log('Upload result:', result);

    return result;
};
