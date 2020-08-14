import { hernanTeQuiero } from './mint-local-functions';
import { expect } from 'chai';

describe('Local functions', () => { 
    it('demo', () => {
        const paths = ["/tmp/resources/file1.txt"]
        const zipFileName = "test.zip"
        const r = hernanTeQuiero(paths, zipFileName)
        //console.log(r)
        //let r = true
        expect(r).to.equal(true);
  }); 
});
