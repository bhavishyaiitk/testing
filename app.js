const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static(path.resolve(__dirname, 'public')));

// Function to read Excel data
function readExcelData() {
    const filePath = path.resolve(__dirname, 'public', 'prof_grades.xlsx');
    if (!fs.existsSync(filePath)) {
        throw new Error("Excel file not found at " + filePath);
    }

    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    return data.map(row => ({
        Year: String(row.Year || '').trim(),
        Semester: String(row.Semester || '').trim(),
        Course: String(row.Course || '').trim(),
        Grade: row.Grade || '',
        Count: row.Count || 0
    }));
}

let formattedData;
try {
    formattedData = readExcelData();
} catch (err) {
    console.error("Error reading Excel data:", err);
    formattedData = [];
}

// Serve main HTML
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Search for courses
app.get('/search', (req, res) => {
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
});

// Suggest course names
app.get('/suggest', (req, res) => {
    const searchText = (req.query.query || '').trim();
    console.log(`Received /suggest request with query: ${searchText}`);
    const suggestions = [...new Set(
        formattedData
            .filter(row => row.Course.toLowerCase().includes(searchText.toLowerCase()))
            .map(row => row.Course)
    )];
    console.log(`Suggestions found: ${suggestions}`);
    res.json(suggestions);
});

// Get years for a course
app.get('/get_years', (req, res) => {
    const courseName = (req.query.course_name || '').trim();
    const years = [...new Set(
        formattedData
            .filter(row => row.Course === courseName)
            .map(row => row.Year)
    )];
    res.json(years);
});

// Get semesters for a course and year
app.get('/get_semesters', (req, res) => {
    const courseName = (req.query.course_name || '').trim();
    const year = (req.query.year || '').trim();
    const semesters = [...new Set(
        formattedData
            .filter(row => row.Course === courseName && row.Year === year)
            .map(row => row.Semester)
    )];
    res.json(semesters);
});

// Get grades for a course, year, and semester
app.get('/get_grades', (req, res) => {
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
});

// Port setup for Vercel
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Export app for Vercel
module.exports = app;
