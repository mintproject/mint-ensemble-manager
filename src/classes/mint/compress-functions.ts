import archiver from "archiver";
import path from "path";
import fs from "fs-extra";
import { Output } from "./mint-types";
import { COMPRESSDIRECTORY } from "../../../src/config/app";
import sgMail from "@sendgrid/mail"

export const helloTest = (): boolean => {
    return true;
}


export const compressAction = async (outputEnsemble: Output[], zipFileName: string, email :string) : Promise<string> => {
    const output = fs.createWriteStream(COMPRESSDIRECTORY + zipFileName + ".zip");
    const archive = archiver('zip', {
        zlib: { level: 0 } // Sets the compression level.
    });

    return new Promise((resolve, reject) => {
        archive.pipe(output);
        output.on('close', () => {
            resolve("path")
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
            } else {
                console.log("Missing file " + location)
            }
        }
        archive.finalize();
    })
}

export const sendMail = async(email: string, thread_id: string, link: string) => {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: email,
      from: "noreply@mint.isi.edu",
      subject: 'Your results are ready',
      templateId: 'd-44f0657038734faab4134c252f96da15',
      dynamicTemplateData: {
        url: link
      }
    };
    await sgMail.send(msg);
}