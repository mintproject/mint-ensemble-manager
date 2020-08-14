import { compressFiles } from './mint-local-functions';
import { expect } from 'chai';
import 'mocha';

describe('First test', 
  () => { 
    it('Compress tests', async () => {
        const paths = ["/tmp/resources/file1.txt"]
        const zipFileName = "test.zip"
        const result = await compressFiles(paths, zipFileName);
        console.log(result)
        expect(result).to.equal(true); 
  }); 
});
