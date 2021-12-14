import QRCode                           from 'qrcode';
import { generateSecret, verifyToken }  from 'node-2fa';
import fs                               from 'fs';
import { createCanvas, Image }          from 'canvas';

const logo = fs.readFileSync(__dirname + '/views/images/qrcodelogo.png');

export interface OTPStruct {
    readonly qr        : string;
    readonly secret    : string;
    backupCodes        : Array<string>;
}

export const otp = {
    /*generateOTPImg: (account: string, issuer: string, secret: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const QRText = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`
            QRCode.toDataURL(QRText, function (err, url) {
                if (err) return reject(err);
                resolve(url);
            })
        })
    },*/

    /**
     * Generate backup codes
     * @param amount Amount of codes that should generate
     * @param length Length of the codes within the dashes
     * @param amountDashes Amount of dashes (-) that should be in the code
     * @returns Array<string>
     * @example const codes = generateBackupCodes(1, 4, 3);
     * console.log(codes); // [ "xpyi-xw8j-qvgi" ]
     */
    generateBackupCodes: (amount: number, length: number, amountDashes: number): Array<string> => {
        const codes: Array<string> = [];
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < amount; i++) {
            const codeDash: Array<string> = [];
            for (let y = 0; y < amountDashes; y++) {
                let code = ""
                for (let z = 0; z < length; z++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                codeDash.push(code);
            }
            codes.push(codeDash.join("-"));
        }
        return codes;
    },
    /**
     * Generates both QR code and backup codes for 2FA.
     * @param account Account (Preferebly the email address)
     * @param issuer Company Name
     * @returns Promise<Record<string, unknown> | boolean>
     * @example const otp = await generate2FA(userData["email"], "ametrine.host");
     * if (!otp) return; // Error handling here.
     * console.log(otp); // { qr: "data:image/png;base64,SUhEUgAAAMQAAADECAY...", secret: "HVMYXEJFMJYDYTTKPHRC", backupCodes: ["xpyi-xw8j-qvgi"] }
     */
    generate2FA: (account: string, issuer: string): Promise<OTPStruct | boolean> => {
        return new Promise((resolve, reject) => {
            const secret = generateSecret({ name: issuer, account: account });
            if (!secret) return false;
            const backupCodes = otp.generateBackupCodes(8, 4, 3);
            const canvas = createCanvas(220, 220);
            
            QRCode.toCanvas(canvas, secret.uri, {
                errorCorrectionLevel: "H",
                margin: 1 }, function (err) {
                if (err) return reject(err);
                const ctx = canvas.getContext('2d');
                const img = new Image()
                img.src = logo
                const dim = { width: 90, height: 90 }
                ctx.drawImage(
                    img,
                    canvas.width / 2 - dim.width / 2,
                    canvas.height / 2 - dim.height / 2,
                    dim.width,
                    dim.height
                );
                return resolve({qr: canvas.toDataURL(), secret: secret.secret, backupCodes})
            })
        })
    },
    verify2FA: (token: number, secret: string): boolean => {
        const verifyCode = verifyToken(secret, token.toString())
        console.log(verifyCode)
        return (verifyCode != null && verifyCode["delta"] == 0);
    }
};
