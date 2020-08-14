import archiver from "archiver";
import path from "path";
import fs from "fs-extra";

export const helloTest = () : boolean => {
    return true;
}



export const compressFiles = async (outputPaths: string[], zipFileName: string) : Promise<void> => {
    const compressDirectory = "/tmp/"
    var output = fs.createWriteStream(compressDirectory + zipFileName);
    var archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
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

    outputPaths.map(outputPath => {
        try {
            if (fs.existsSync(outputPath)) {
                archive.append(fs.createReadStream(outputPath), { name: path.basename(outputPath) });
            }
        } catch (err) {
            throw err
        }
    })
    return await archive.finalize();
}

