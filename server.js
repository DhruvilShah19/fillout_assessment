import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

async function fetchDataFromExternalAPI(formId) {
    const apiUrl = `https://api.fillout.com/v1/api/forms/${formId}`;
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                // Take it statically right now only for assessment purpose instead of taking it as an env environment
                'Authorization': `Bearer sk_prod_TfMbARhdgues5AuIosvvdAC9WsA5kXiZlW8HZPaRDlIbCpSpLsXBeZO7dCVZQwHAY3P4VSBPiiC33poZ1tdUj2ljOzdTCCOSpUZ_3912`, // Corrected to use API_KEY from .env
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorBody = await response.text(); // Added to log the error response body
            throw new Error(`API call failed with status: ${response.status}, body: ${errorBody}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching data from external API:', error);
        throw error;
    }
}
// Function to apply filters to form responses
function applyFilters(responses, filters) {
    // Assuming filters is already parsed JSON object
    return responses.filter(response => {
        return filters.every(filter => {
            const answer = response.answers?.find(ans => ans.questionId === filter.id) || null;
            if (!answer) return false;

            switch (filter.condition) {
                case 'equals': return answer.value.toString() === filter.value.toString();
                case 'does_not_equal': return answer.value.toString() !== filter.value.toString();
                case 'greater_than': return parseFloat(answer.value) > parseFloat(filter.value);
                case 'less_than': return parseFloat(answer.value) < parseFloat(filter.value);
                default: return false; 
            }
        });
    });
}


// Route to handle filtered responses
app.get('/:formId/filteredResponses', async (req, res) => {
    const { formId } = req.params;
    const { filters, page = 1, limit = 10 } = req.query;
    const apiKey = process.env.API_KEY;

    try {
        const formData = await fetchDataFromExternalAPI(formId, apiKey);

        // Assume formData.responses contains the data we want to filter
        let responses = formData.questions || [];

        // If filters are provided, parse and apply them
        if (filters) {
            const parsedFilters = JSON.parse(filters);
            responses = applyFilters(responses, parsedFilters);
        }

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedResponses = responses.slice(startIndex, endIndex);

        // Return filtered and paginated responses
        res.json({
            totalResponses: responses.length,
            pageCount: Math.ceil(responses.length / limit),
            data: paginatedResponses,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
