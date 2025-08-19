# ChatPDF API Setup Guide

This guide explains how to set up the ChatPDF API integration for the AI Assistant feature.

## Prerequisites

1. A ChatPDF account at [https://www.chatpdf.com](https://www.chatpdf.com)
2. A ChatPDF API key

## Getting Your ChatPDF API Key

1. Sign up or log in to [ChatPDF](https://www.chatpdf.com)
2. Go to your account settings
3. Navigate to the API section
4. Generate a new API key
5. Copy the API key (it starts with `sec_`)

## Environment Configuration

### Backend Setup

Add the following environment variable to your `.env` file in the backend directory:

```env
CHATPDF_API_KEY=sec_your_api_key_here
```

### Frontend Setup (Optional)

If you want to use the ChatPDF API directly from the frontend (not recommended for production), add this to your frontend `.env` file:

```env
VITE_CHATPDF_API_KEY=sec_your_api_key_here
```

**Note:** The current implementation uses the backend API endpoints for security, so the frontend environment variable is not required.

## Features

The AI Assistant includes the following features:

### PDF Upload Methods
- **File Upload**: Upload PDF files directly from your computer
- **URL Upload**: Add PDFs from publicly accessible URLs

### Chat Features
- **Conversation History**: Keep track of multiple PDF conversations
- **Reference Sources**: Get page references for AI responses
- **Real-time Chat**: Interactive chat interface with loading states
- **Error Handling**: Comprehensive error handling and user feedback

### Management Features
- **Conversation Management**: View, switch between, and delete conversations
- **File Cleanup**: Automatic cleanup of uploaded files
- **Source Deletion**: Remove PDF sources from ChatPDF when deleting conversations

## API Endpoints

The backend provides the following ChatPDF endpoints:

- `POST /api/chatpdf/add-url` - Add PDF from URL
- `POST /api/chatpdf/add-file` - Upload PDF file
- `POST /api/chatpdf/chat` - Send chat message
- `DELETE /api/chatpdf/sources` - Delete PDF sources

## Usage

1. Navigate to the AI Assistant page
2. Choose your upload method (File or URL)
3. Upload or provide the URL for your PDF
4. Start asking questions about your PDF
5. View conversation history in the sidebar
6. Switch between different PDF conversations

## Security Notes

- API keys are stored securely on the backend
- All requests are authenticated using JWT tokens
- File uploads are validated and cleaned up automatically
- PDF sources are deleted from ChatPDF when conversations are removed

## Troubleshooting

### Common Issues

1. **"ChatPDF API key not configured"**
   - Ensure the `CHATPDF_API_KEY` environment variable is set in your backend `.env` file
   - Restart the backend server after adding the environment variable

2. **"Failed to upload file"**
   - Check that the file is a valid PDF
   - Ensure the file size is under 32MB
   - Verify the file is not corrupted

3. **"Failed to upload from URL"**
   - Ensure the URL is publicly accessible
   - Check that the URL points to a valid PDF file
   - Verify the URL is not behind authentication

4. **"Failed to get response"**
   - Check your internet connection
   - Verify the ChatPDF API key is valid
   - Ensure the PDF source is still available

### API Limits

- PDF files are limited to 2,000 pages or 32 MB per file
- Up to 6 messages can be included in one request
- Total OpenAI tokens in messages cannot exceed 2,500

## Support

For issues with the ChatPDF API itself, refer to the [official ChatPDF API documentation](https://www.chatpdf.com/docs/api/backend).
