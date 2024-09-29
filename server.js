const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const app = express();
app.use(cors());
app.use(express.json());

const filePath = path.join(__dirname, 'data.csv');

// Create CSV Writer
const csvWriter = createObjectCsvWriter({
  path: filePath,
  header: [
    { id: 'id', title: 'ID' },
    { id: 'data', title: 'DATA' },
  ],
  append: true, // Append new data
});

// Generate a unique ID for each entry
const generateId = () => `ABC${Math.floor(1000 + Math.random() * 9000)}`;

// Add new data
app.post('/add-data', (req, res) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ message: 'No data provided' });
  }

  const id = generateId();
  const record = [{ id, data }];
  console.log('Writing new record:', record);

  csvWriter
    .writeRecords(record)
    .then(() => {
      console.log('Data successfully written to CSV.');
      res.status(200).json({ message: 'Data added successfully', id });
    })
    .catch((err) => {
      console.error('Error writing to CSV:', err.message);
      res.status(500).json({ error: 'Error writing to CSV' });
    });
});

// Modify data by ID
app.put('/modify-data', (req, res) => {
  const { id, newData } = req.body;

  if (!id || !newData) {
    return res.status(400).json({ message: 'ID and new data are required' });
  }

  // Read and modify the CSV file
  fs.readFile(filePath, 'utf8', (err, csvData) => {
    if (err) return res.status(500).json({ error: 'Error reading CSV' });

    let lines = csvData.split('\n');
    let updated = false;

    lines = lines.map(line => {
      if (line.startsWith(id)) {
        updated = true;
        return `${id},${newData}`;
      }
      return line;
    });

    if (!updated) {
      return res.status(404).json({ error: 'ID not found' });
    }

    // Write the updated data back to the CSV
    fs.writeFile(filePath, lines.join('\n'), (err) => {
      if (err) return res.status(500).json({ error: 'Error writing to CSV' });
      res.status(200).json({ message: 'Data modified successfully' });
    });
  });
});

// Delete data by ID
app.delete('/delete-data/:id', (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'ID is required' });
  }

  // Read and modify the CSV file
  fs.readFile(filePath, 'utf8', (err, csvData) => {
    if (err) return res.status(500).json({ error: 'Error reading CSV' });

    const lines = csvData.split('\n');
    const filteredLines = lines.filter(line => !line.startsWith(id));

    if (lines.length === filteredLines.length) {
      return res.status(404).json({ error: 'ID not found' });
    }

    // Write the modified data back to the CSV
    fs.writeFile(filePath, filteredLines.join('\n'), (err) => {
      if (err) return res.status(500).json({ error: 'Error writing to CSV' });
      res.status(200).json({ message: 'Data deleted successfully' });
    });
  });
});

app.get('/get-data', (req, res) => {
  console.log('Fetching data from CSV...');
  const results = [];

  if (fs.existsSync(filePath)) {
    fs.createReadStream(filePath)
      .pipe(csv({ headers: ['ID', 'DATA'], skipLines: 1 })) // Explicit headers
      .on('data', (row) => {
        console.log('Row fetched from CSV:', row); // Log each row for debugging
        results.push(row);
      })
      .on('end', () => {
        console.log('CSV data parsed successfully:', results); // Log the parsed data
        res.json(results); // Send the results as a JSON response
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error.message);
        res.status(500).json({ error: error.message });
      });
  } else {
    console.log('No CSV file found.');
    res.status(200).json({ message: 'No data found.' });
  }
});


// Start the server on port 5001
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



/// http://localhost:5001/get-data