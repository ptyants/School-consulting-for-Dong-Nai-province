import { createClient } from '@supabase/supabase-js';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio';
import axios from 'axios';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { Document } from '@langchain/core/documents';
import { deleteFolder, streamUploadMutiple, uploadFilePdf } from '../cloudinary/index';
import fs from 'fs';
import { convertToSlug, getRandomID } from '../../utilities/func';
import { LOGO_DNTU, dataLink } from '../../utilities/constants';
import { writeFile } from 'fs/promises';

const getGeminiEmbeddings = async (texts, apiKey) => {
  try {
    const response = await axios.post(
      'https://api.gemini.com/embeddings',
      { texts }, // Giả định Gemini yêu cầu một mảng văn bản
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.embeddings; // Giả định rằng API trả về một mảng embeddings
  } catch (error) {
    console.error('Lỗi khi gọi API Gemini:', error);
    throw error;
  }
};

export const uploadWithTextSplitter = async (docs, chunkSize = 1000, chunkOverlap = 500) => {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap
  });

  const splitDocs = await textSplitter.splitDocuments(docs);
  const texts = splitDocs.map(doc => doc.pageContent);

  const sbApiKey = process.env.SUPABASE_API_KEY;
  const sbUrl = process.env.SUPABASE_URL_LC_CHATBOT;
  const geminiApiKey = process.env.GEMINI_API_KEY; // Thay đổi biến môi trường cho Gemini API

  const embeddings = await getGeminiEmbeddings(texts, geminiApiKey);

  const client = createClient(sbUrl || '', sbApiKey || '');

  const result = await SupabaseVectorStore.fromEmbeddings(
    embeddings,
    splitDocs,
    {
      client,
      tableName: 'documents'
    }
  );

  return result;
};

export const uploadDocumentsToSupabaseCloud = async (directory = 'src/documents/upload', type_file = '.pdf .txt', chunkSize = 1000, chunkOverlap = 500) => {
  const typeFileArr = type_file.split(' ');
  const configDirectory = {};
  typeFileArr.forEach(type => {
    if (type === '.pdf') {
      configDirectory['.pdf'] = (path) => new PDFLoader(path);
    } else if (type === '.txt') {
      configDirectory['.txt'] = (path) => new TextLoader(path);
    }
  });
  try {
    const directoryLoader = new DirectoryLoader(directory, configDirectory);
    const docs = await directoryLoader.load();
    const result = await uploadWithTextSplitter(docs, chunkSize, chunkOverlap);
    console.log('🚀 ~ uploadDocumentsToSupabaseCloud ~ result:', result);
    return 'OK';
  } catch (err) {
    console.log(err);
  }
};

export const uploadWebsiteToSupabaseCloud = async (website, selector = 'body') => {
  try {
    const loader = new CheerioWebBaseLoader(website, {
      selector
    });
    const docs = await loader.load();
    return docs;
  } catch (err) {
    console.log(err);
  }
};

export const getWebsitesPromise = (websiteUrl, selector) => {
  return new Promise((resolve, reject) => {
    try {
      const loader = new CheerioWebBaseLoader(websiteUrl, {
        selector // tổng hợp html
      });
      resolve(loader.load());
    } catch (error) {
      reject(error);
    }
  });
};

export const uploadMultiWebsitesToSupabaseCloud = async (websiteUrls, selector = 'body', chunkSize = 500, chunkOverlap = 100) => {
  try {
    const promiseArr = [];
    let docsArr = [];
    websiteUrls.forEach((url) => {
      promiseArr.push(getWebsitesPromise(url, selector));
    });
    await Promise.all(promiseArr)
      .then((results) => {
        docsArr = results.flat();
      })
      .catch((err) => {
        console.log('🚀 ~ getMutilImage ~ err:', err);
      });

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap
    });

    const splitDocs = await textSplitter.splitDocuments(docsArr);
    console.log('🚀 ~ uploadMultiWebsitesToSupabaseCloud ~ splitDocs:', splitDocs);

    const sbApiKey = process.env.SUPABASE_API_KEY;
    const sbUrl = process.env.SUPABASE_URL_LC_CHATBOT;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    const texts = splitDocs.map(doc => doc.pageContent);
    const embeddings = await getGeminiEmbeddings(texts, geminiApiKey);

    const client = createClient(sbUrl || '', sbApiKey || '');

    const result = await SupabaseVectorStore.fromEmbeddings(
      embeddings,
      splitDocs,
      {
        client,
        tableName: 'documents'
      }
    );
    console.log('🚀 ~ uploadDocumentsToSupabaseCloud ~ result:', result);
    return 'Ok';
  } catch (err) {
    console.log(err);
  }
};

const readBufferImagePromise = (_filePath, fileName) => {
  return new Promise((resolve, reject) => {
    fs.readFile(_filePath, (err, fileBuffer) => {
      if (err) {
        console.error('Không thể đọc tệp hình ảnh:', err);
        reject(err);
      } else
        resolve({
          origin_file_name: fileName,
          buffer: fileBuffer
        });
    });
  });
};

const processFileMD = (_rootFolder, _folderName) => {
  return new Promise((resolve, reject) => {
    fs.readFile(`${_rootFolder}/${_folderName}/${_folderName}.md`, 'utf8', async (err, plainText) => {
      if (err) {
        reject(err);
        return;
      }

      const regex = /!\[.*?\]\((?!https?:\/\/)(.*?\.(png|jpeg))\)/g;
      const filenames = [];

      let match;
      while ((match = regex.exec(plainText)) !== null) {
        filenames.push(match[1]);
      }

      console.log(filenames);
      console.log('filenames', filenames);

      if (filenames && filenames.length) {
        let imageBufferArr = [];
        const promises = [];
        filenames.forEach(fileName => promises.push(readBufferImagePromise(`${_rootFolder}/${_folderName}/${fileName}`, fileName)));

        await Promise.all(promises)
          .then((results) => {
            imageBufferArr = results;
          })
          .catch((err) => {
            console.log('🚀 ~ getMutilImage ~ err:', err);
            reject(err);
          });

        const slugFolderName = convertToSlug(_folderName);
        const urlPdfImages = await streamUploadMutiple(imageBufferArr, {
          folder: 'PdfImages',
          resource_type: 'auto'
        });

        let plainTextClone = plainText;
        urlPdfImages.forEach(obj => {
          plainTextClone = plainTextClone.replace(obj.origin_file_name, obj.url);
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
      } else {
        const id = _folderName.toLowerCase().split(' ').join('_');
        const metaData = dataLink.find(i => i.title == _folderName);

        if (metaData) {
          resolve(new Document({
            pageContent: plainText,
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
            pageContent: plainText,
            metadata: {
              id: pdfUrlAndID.id,
              title: _folderName + '.pdf',
              link: pdfUrlAndID.url,
              favicon: LOGO_DNTU,
              snippet: _folderName
            }
          }));
        }
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
        console.log('🚀 ~ getMutilImage ~ err:', err);
      });
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap
  });

  console.log('🚀 ~ uploadSingleDocMDToSupabase ~ documents:', documents);
  const splitDocs = await textSplitter.splitDocuments(documents);

  await writeFile('src/documents/upload/upload.txt', JSON.stringify(splitDocs));
  const sbApiKey = process.env.SUPABASE_API_KEY;
  const sbUrl = process.env.SUPABASE_URL_LC_CHATBOT;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const texts = splitDocs.map(doc => doc.pageContent);
  const embeddings = await getGeminiEmbeddings(texts, geminiApiKey);

  const client = createClient(sbUrl || '', sbApiKey || '');

  const result = await SupabaseVectorStore.fromEmbeddings(
    embeddings,
    splitDocs,
    {
      client,
      tableName: 'documents'
    }
  );
  console.log('🚀 ~ uploadDocumentsToSupabaseCloud ~ result:', result);
};
