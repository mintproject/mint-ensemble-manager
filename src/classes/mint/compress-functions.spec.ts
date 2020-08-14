import {  compressFiles} from './compress-functions';
import { expect } from 'chai';
import 'mocha';
import { exception } from 'console';
 
describe('Compress tests', () => {
 
  it('Enable to compress', async ( ) => {
      const paths = ["/tmp/resources/file1.txt", "/tmp/resources/file2.txt"]
      const zipFileName = "test.zip"
      let r = await compressFiles(paths, zipFileName)
  }); 

  it('Failing compress tests', async ( ) => {
    const paths = ["/tmp/resources/file1.txt", "/tmp/resources/file.txt"]
    const zipFileName = "test.zip"
    let r = await compressFiles(paths, zipFileName)
  }); 

});