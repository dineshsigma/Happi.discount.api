const { Parser } = require('json2csv');

async function DownloadCSV(data, res) {

    const fields = data[0].keys;
    const opts = { fields };
    try {
        const parser = new Parser(opts);
        const csv = parser.parse(data);
        res.setHeader('Content-disposition', 'attachment; filename=storeBucket.csv');
        res.set('Content-Type', 'text/csv');
        res.status(200).send(csv);
    } catch (error) {
        return res.json({
            status: false,
            message: error.message
        });
    }
}
module.exports.DownloadCSV = DownloadCSV