import {  compressFiles} from './compress-functions';
import { expect } from 'chai';
import 'mocha';
import { exception } from 'console';
 


describe('Compress tests', () => {
  it('Test', async ( ) => {
      const test_ensemble = [
        {
          location: "/tmp/resources/file1.txt",
          id: 'economic-land-use',
          name: 'economic-land-use-a57b3e939d44f633f9bc2cc52e68ba50',
          url: 'https://data.mint.isi.edu/files/local-execution/economic-land-use-a57b3e939d44f633f9bc2cc52e68ba50',
          ensemble_id: '000143845d48ea94a9dec8d2aebc3156'
        },
        {
          name: 'cycles_season-2c63648e703dabbed57542d40748a7fd',
          id: 'cycles_season',
          url: 'https://data.mint.isi.edu/files/local-execution/cycles_season-2c63648e703dabbed57542d40748a7fd',
          location: '/Users/mosorio/Downloads/buffy.the.vampire.slayer.s06e01.1080p.web.h264-nixon[eztv.io].mkv',
          ensemble_id: '0001bfb4435afc66b33b7df4bad4ac3e'
        }
      ] 
    const zipFileName = "topoflow.3.6.0"
    Promise.all([compressFiles(test_ensemble, zipFileName)])


  }); 


});