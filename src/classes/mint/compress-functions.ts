import archiver from "archiver";
import path from "path";
import fs from "fs-extra";
import { Output } from "./mint-types";
import { COMPRESSDIRECTORY } from "../../../src/config/app";

export const helloTest = (): boolean => {
    return true;
}



export const compressFiles = async (outputEnsemble: Output[], zipFileName: string): Promise<void> => {
    var output = fs.createWriteStream(COMPRESSDIRECTORY + zipFileName + ".zip");
    var archive = archiver('zip', {
        zlib: { level: 0 } // Sets the compression level.
    });

    archive.pipe(output);
    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
    });

    output.on('end', function () {
        console.log('Data has been drained');
    });

    archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
            // log warning
        } else {
            // throw error
            throw err;
        }
    });
    for (const output of outputEnsemble.values()) {
        const location = output.location
        const destination = output.ensemble_id + '/' + path.basename(location) 
        if (fs.existsSync(location)) {
            console.log(location)
            archive.append(fs.createReadStream(location), { name: destination });
        }
    }
    archive.finalize()
}

