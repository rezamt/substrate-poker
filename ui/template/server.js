import express from 'express';

const port = %PORT%;
let app = express();
app.use(express.static('dist'));

app.listen(port, () => {
  console.log('Listening on port %PORT%');
});
