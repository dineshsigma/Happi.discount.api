var fcm = require("fcm-notification");
let logsService = require("../logservice.js");
let serviceAccount = {
  type: "service_account",
  project_id: "happi-ticket",
  private_key_id: "1263ed6c03c1b8c70a458fae2aec765c8b6f38e7",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCaR/ipB76ws7hH\ntqRH2vdI99Q7akvMBQFjzdN0eob15Klk9Inhhjkhh9nsuOcnxrGXRpDGXDpyzo0v\nsIYYgfaRwQpMRGATWT3U/qYNLHKalxXQGX8wLcIP5tlBg16aZ73HE4RbEa7RJ1vh\nke2aDWID58up/7HEsFH7ET+lH94dtNUoFrndz68snfWF2kre5JI1JKUPEzeWDe8p\nzTCVlEkloILKKBfJ5Qqw5UcQUEwnm6ILhllhjAjHol5H/oT0COO6mQFX7ylSw7et\na8MiqQWoQQd8JuGro03LSF7BUFVFW2k5WQi0QONf9FnabQ21Jb81jbayCxzpc1QA\nqjLbBA/9AgMBAAECggEASkthR8imgAIzujkOOFoOHhHWHnyMHqXEaxLZgqxkZHIm\nTqrh4PwZc/evLmtGSWXJ7H67RgJw1Qt5et8nXBLtsXfD5UFCAN9HQtQUE6D1WVNr\nWiiFEqbeXnj84ysHehR+E6lm4dIMnMS23tO+lyJdsmLDtUwgB4cfG2fNfc9wT14f\nog7YJwZG7i5czDvTBbv1QhABlsfZPvauZfRbfxUrUpl/n9GDie9FMT1ZAc7MAYPU\nftmu4wPjfz9DcdxKRRF5XYO2dHLQfX5BlU9HiUmQS3DFISap+TZDWpl4yisO0VE1\nSMLUqlMy9JRpCdk7Q1Gj7vMy2ucilqLP70Sz8rdTowKBgQDJJYPv+bqjCYayp0K6\nXWe/ufiB4707nQiB9NLzObU02h6i0nzT72gHDfUvCvBruQ9wSuA1g8YL0YGcSUrV\nQQV5UutOIVQk+Xvfs5c9yPYyo/jnQ6icRhhScQm2mIraoQkZ4Rg9XlOlbHqLXN7O\nazRkr9gOmGW9PDQTUiwkjJYWIwKBgQDEWq2rQiEgRDmBOBEWVvM/m281GhIaAwHa\nwgVgnNYbybbNOQ9fSqVR7RUKWwsabHKzBcd4EFGon5YqGE3w0Rj2/gs0E/I/Cca3\nsOISmzg8crFvWLXb+n7UfZvkqbtaDeYOD/T8wj0hqM4T5EiaiE9hxwcWTvbKYiqV\nZSVIvlHTXwKBgDOaQT/WVFAxSHIawN6oyc4A+sTv1QMvJRiZ42hsnJVDg+qHj2ib\nmZd9uDHqX4VzQ4euXdi8xpkPlW2vy9frx2i5og44NKsLqgDYxOsf3DFfqaJC1EXL\nIcA8qZ5DghPWjkwqWBqeUV01+DY6jBpunFFcX1RXOnqSsFVollSGEJb7AoGBAJmo\nNHvutimf+jhK/eQziwvdwTsW+c9tRwhACSE/2rXINsuGuabirVjdZTfDY378Gw5J\nmX01mBGTQVoTxvqLRzQSPgY1Db+TEPUy8NeKrIlxX7U5AKfy8UmsOlDJGpowgjXC\n+v7Jqjkq9onOfZqgzS5BKCSnCq36AEUE8BZrCXGVAoGBAMJgav8EcWARbNKnNsUX\nnUAqSV+3r8l07As4mg7e0qYdHXZ8NNvfWJ8FJKyorFFfCSF3ijGJlYSUZ+Cj/i5v\nzo14OvpHEK7yezkT6ZCsA2JxwMRVtYyvLzJA1hVqpTDZERE3suhL1fbFAQ7B48NK\n/drh1ZdATLmbVC6d0iqoPHi6\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-1h2rx@happi-ticket.iam.gserviceaccount.com",
  client_id: "110208887955509527137",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-1h2rx%40happi-ticket.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};
var FCM = new fcm(serviceAccount);
async function sendNotification(notification_data, tokens) {
  var message = {
    data: {
      score: "850",
      time: "2:45",
    },
    notification: {
      title: notification_data?.title,
      body: notification_data?.message,
      type: notification_data?.type,
    },
  };
  try {
    FCM.sendToMultipleToken(message, tokens, function (err, response) {
      if (err) {
        console.log("err--", err);
        return "error";
      } else {
        console.log("response-----", response);
        logsService.stock_transferlog(
          "debug",
          message,
          `NOTIFICATION RESPONSE`,
          response
        );
      }
    });
  } catch (error) {
    return "error";
  }
}

module.exports.sendNotification = sendNotification;

// let tokens = [
//     "cWNBbgEcSgWWVcigpM4x6T:APA91bEepcXY0lzWuC03PzMCXbwoMvR5I5apnr3v6KyRtmwDBk_3JDAIi6k-JJLFAQxI1Gd47iuLMzIO4EI0jBHx8SHeXWyh5liFfBvwgAJv97bAH4UKLtXdeKB6msWi3hxcBrTjkZmY",
//   ];
// sendNotification(tokens);
