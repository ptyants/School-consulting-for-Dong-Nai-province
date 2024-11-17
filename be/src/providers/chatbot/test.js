const path = require('path');

const processFileMD = (_rootFolder, _folderName) => {
  return new Promise((resolve, reject) => {
    fs.readFile(`${_rootFolder}/${_folderName}/${_folderName}.md`, 'utf8', async (err, plainText) => {
      if (err) {
        reject(err);
        return;
      }

      const regex = /!\[.*?\]\(\((.*?)\)\)/g;
      const filenames = [];

      let match;
      while ((match = regex.exec(plainText)) !== null) {
        filenames.push(match[1]);
      }

      console.log('filenames', filenames);

      if (filenames && filenames.length) {
        let imageBufferArr = [];
        const promises = [];
        filenames.forEach(fileName => {
          // Convert relative path to absolute path
          const absolutePath = path.resolve(`${_rootFolder}/${_folderName}`, fileName);
          promises.push(readBufferImagePromise(absolutePath, fileName));
        });

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
