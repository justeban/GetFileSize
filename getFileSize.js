'use strict';

const cmd = require('node-cmd');
const Promise = require('bluebird');

const runCommandAsync = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });

const directory = process.argv[2] ? process.argv[2] : './';
const flag = process.argv[3] ? process.argv[3] : '';

if (!directory) { throw new Error('No Directory Given'); }

let runCommand = async (command) => {
  try {
    return await runCommandAsync(command);
  } catch (err) {
    command = `sudo ${command}`;
    return await runCommandAsync(command);
  }
}

let retrieveFileSizes = async () => {
  let command = `ls -a ${directory}`;
  let data;
  try {
    data = await runCommand(command);
  } catch (err) {
    return err;
  }
  let filteredDir = data[0].split('\n').filter((file) => file !== '' && file !== '.' && file !== '..');
  const files = filteredDir.map(async file => {
    let newFile = file.replace(/ /gm, '\\ ');
    let command = `du -sh ${newFile}`;
    let dirData;
    try {
      dirData = await runCommand(command);
      return dirData[0].replace(/\\n/gm, ' ').split('\t');
    } catch (e) {
      return;
    }
  });
  return Promise.all(files);
};

let getGByteFiles = (files) => {
  return files.filter(file => {
    const [size] = file;
    return size.includes('G')
  })
};

let getSize = (fileInfo) => {
  const [sizeAsString] = fileInfo;
  return parseFloat(sizeAsString.split(/w/)[0]);
};

let getSuffix = (fileInfo) => {
  var regex = /[A-Z]/g
  const [sizeAsString] = fileInfo;
  return sizeAsString.match(regex)[0];
}

let convertSize = (preConversionSize, suffix) => {
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

let compareNumbers = (a, b) => {
  const aSize = getSize(a);
  const bSize = getSize(b);
  const aSuffix = getSuffix(a);
  const bSuffix = getSuffix(b);
  const aNormalizedSize = convertSize(aSize, aSuffix);
  const bNormalizedSize = convertSize(bSize, bSuffix);
  return bNormalizedSize - aNormalizedSize;
};

retrieveFileSizes()
  .then(files => {
    const filteredFiles = files.filter(Boolean);
    const sortedFiles = filteredFiles.sort(compareNumbers);
    if (flag === '-g') { 
      console.log(getGByteFiles(sortedFiles));
      return;
    } else {
      console.log(sortedFiles);
    }
  })
  .catch(err => console.log(err));

