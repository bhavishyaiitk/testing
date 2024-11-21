const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

// Define the path for the Excel file and verify its existence
const excelFilePath = path.join(__dirname, 'public', 'prof_grades.xlsx');
if (!fs.existsSync(excelFilePath)) {
    console.error(`Error: Excel file not found at ${excelFilePath}`);
    process.exit(1); // Exit the application if the file is missing
}

// Load the Excel file
let formattedData = [];
try {
    const workbook = xlsx.readFile(excelFilePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Ensure consistency in data fields
    formattedData = data.map(row => ({
        Year: String(row.Year || '').trim(),
        Semester: String(row.Semester || '').trim(),
        Course: String(row.Course || '').trim(),
        Grade: row.Grade || '',
        Count: row.Count || 0
    }));
} catch (err) {
    console.error('Error reading or parsing the Excel file:', err);
    process.exit(1); // Exit the application if the file cannot be loaded
}

// Configure CORS
const corsOptions = {
    origin: 'https://testing-amber-beta.vercel.app', // Replace with your frontend’s Vercel domain
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Search for a course by name
app.get('/search', (req, res) => {
    try {
        const courseName = (req.query.course_name || '').trim();
        const results = formattedData.filter(row =>
            row.Course.toLowerCase().includes(courseName.toLowerCase())
        );
        res.json(results.map(row => ({
            Year: row.Year,
            Semester: row.Semester,
            Course: row.Course,
            Grade: row.Grade,
            Count: row.Count
        })));
    } catch (err) {
        console.error('Error in /search:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Suggest course names based on a query
app.get('/suggest', (req, res) => {
    try {
        const searchText = (req.query.query || '').trim();
        const suggestions = [...new Set(
            formattedData
                .filter(row => row.Course.toLowerCase().includes(searchText.toLowerCase()))
                .map(row => row.Course)
        )];
        res.json(suggestions);
    } catch (err) {
        console.error('Error in /suggest:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Get available years for a specific course
app.get('/get_years', (req, res) => {
    try {
        const courseName = (req.query.course_name || '').trim();
        const years = [...new Set(
            formattedData
                .filter(row => row.Course === courseName)
                .map(row => row.Year)
        )];
        res.json(years);
    } catch (err) {
        console.error('Error in /get_years:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Get available semesters for a specific course and year
app.get('/get_semesters', (req, res) => {
    try {
        const courseName = (req.query.course_name || '').trim();
        const year = (req.query.year || '').trim();
        const semesters = [...new Set(
            formattedData
                .filter(row => row.Course === courseName && row.Year === year)
                .map(row => row.Semester)
        )];
        res.json(semesters);
    } catch (err) {
        console.error('Error in /get_semesters:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Get grades and counts for a specific course, year, and semester
app.get('/get_grades', (req, res) => {
    try {
        const courseName = (req.query.course_name || '').trim();
        const year = (req.query.year || '').trim();
        const semester = (req.query.semester || '').trim();

        const results = formattedData
            .filter(row =>
                row.Course === courseName &&
                row.Year === year &&
                row.Semester === semester
            )
            .sort((a, b) => a.Grade.localeCompare(b.Grade))
            .map(row => ({
                Semester: row.Semester,
                Grade: row.Grade,
                Count: row.Count
            }));

        res.json(results);
    } catch (err) {
        console.error('Error in /get_grades:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server (local development)
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

// Export the app for Vercel
module.exports = app;
