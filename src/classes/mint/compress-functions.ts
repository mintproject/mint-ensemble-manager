import archiver from "archiver";
import path from "path";
import fs from "fs-extra";
import { Output } from "./mint-types";
import { COMPRESSDIRECTORY } from "../../../src/config/app";

export const helloTest = (): boolean => {
    return true;
}




export const compresSend = async (outputEnsemble: Output[], zipFileName: string, email :string) => {
    const output = fs.createWriteStream(COMPRESSDIRECTORY + zipFileName + ".zip");
    const archive = archiver('zip', {
        zlib: { level: 0 } // Sets the compression level.
    });

    return new Promise((resolve, reject) => {
        archive.pipe(output);
        output.on('close', () => {
            resolve()
            sendMail(email)
        })

        output.on('end', function () {
            console.log('Data has been drained');
        });

        for (const output of outputEnsemble.values()) {
            const location = output.location
            const destination = output.ensemble_id + '/' + path.basename(location)
            if (fs.existsSync(location)) {
                console.log(location)
                archive.append(fs.createReadStream(location), { name: destination });
            }
        }
        archive.finalize();
    })
}

export const sendMail = async(email: string) => {
    console.log("email")
}