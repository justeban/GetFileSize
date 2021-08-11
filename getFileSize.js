'use strict';

const cmd = require('node-cmd');

const runCommandAsync = command => new Promise((res, rej) => {
  cmd.run(command, (err, data) => {
    if (err) { rej(err); }
    return res(data)
  })
});

const directory = process.argv[2] ? process.argv[2] : './';
const flag = process.argv[3] ? process.argv[3] : '';

if (!directory) { throw new Error('No Directory Given'); }

const runCommand = async (command) => {
  try {
    return runCommandAsync(command);
  } catch (err) {
    // try again with sudo
    const withSudo = `sudo ${command}`;
    return runCommandAsync(withSudo);
  }
}

const retrieveListOfFiles = () => {
  let command = `ls -a ${directory}`;
  try {
    return runCommand(command);
  } catch (err) {
    return err;
  }
}

const retrieveFileSizes = async () => {
  const listOfFiles = await retrieveListOfFiles();
  const filteredDir = listOfFiles.split('\n').filter((file) => file !== '' && file !== '.' && file !== '..');
  const files = filteredDir.map(async file => {
    const newFile = file.replace(/ /gm, '\\ ');
    const diskUsage = `du -sh ${newFile}`;
    try {
      const dirData = await runCommand(diskUsage);
      return dirData.replace(/\\n/gm, ' ').split('\t');
    } catch (e) {
      return;
    }
  });
  return Promise.all(files);
};

const getGByteFiles = (files) => {
  return files.filter(file => {
    const [size] = file;
    return size.includes('G')
  })
};

const getSize = (fileInfo) => {
  const [sizeAsString] = fileInfo;
  return parseFloat(sizeAsString.split(/w/)[0]);
};

const getSuffix = (fileInfo) => {
  var regex = /[A-Z]/g
  const [sizeAsString] = fileInfo;
  return sizeAsString.match(regex)[0];
}

const convertSize = (preConversionSize, suffix) => {
  switch (suffix) {
    case 'B':
      return preConversionSize;
    case 'K':
      return preConversionSize * 1000;
    case 'M':
      return preConversionSize * 1000000;
    case 'G':
      return preConversionSize * 1000000000;
  }
}

const compareNumbers = (a, b) => {
  const aSize = getSize(a);
  const bSize = getSize(b);
  const aSuffix = getSuffix(a);
  const bSuffix = getSuffix(b);
  const aNormalizedSize = convertSize(aSize, aSuffix);
  const bNormalizedSize = convertSize(bSize, bSuffix);
  return bNormalizedSize - aNormalizedSize;
};

const displayDataTable = (fileData) => {
  const tableData = fileData.map(file => ({ size: file[0], name: file[1] }));
  console.table(tableData, ['size', 'name']);
}

(async () => {
  try {
    const files = await retrieveFileSizes();
    const filteredFiles = files.filter(file => file && file[0] && file[1]);
    const sortedFiles = filteredFiles.sort(compareNumbers);
  
    if (flag === '-g') { 
      displayDataTable(getGByteFiles(sortedFiles));
      return;
    } else {
      displayDataTable(sortedFiles);
    }
  } catch (err) {
    console.error(err);
  }
})()
