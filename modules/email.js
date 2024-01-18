let nodemailer = require('nodemailer');
let options = {
    host: "smtp.cloudzimail.com",
    port: 587,
    ignoreTLS: true,
   // secure: true, // use TLS
    auth: {
        user: "noreply@happimobiles.com",
        pass: "Iipl@13579"
    },
    timeout: 10000
}
let smtpTransport = nodemailer.createTransport(options);
let fromAddress = "noreply@happimobiles.com";
async function send_mail(to, subject, body, attachments) {
    let obj = {
        from: fromAddress, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        html: body, // plain text body
        //html: html, // html body
        attachments: attachments
    };
    let result = {};
    try {
        let resp = await smtpTransport.sendMail(obj);
        result.success = resp;
    }catch (e) {
        result.err = e;
    }
    console.log(result)

    return result;

};

module.exports.send_mail = send_mail;








// this.send_mail("srk@iipl.work","HAPPPI MOBILE ORDER", "HI Test", [], function(err, data){
//     console.log(err, data);
// });
