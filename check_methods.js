const apiKey = 'AIzaSyDlZkup1flENOaxCaiCLZs01_AxImk7wP0';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.models) {
      data.models.forEach(m => {
        console.log(`${m.name} | Methods: ${m.supportedGenerationMethods.join(',')}`);
      });
    } else {
      console.log('Error:', data);
    }
  });
