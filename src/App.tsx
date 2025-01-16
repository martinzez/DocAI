import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';

const App: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('Answers will be shown here.');
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promptType, setPromptType] = useState<'preMade' | 'custom' | 'none'>('none');
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const apiUrl = 'http://localhost:11434/api/chat';

  const preMadePrompts = {
    dictionaryToCSV: `You are a precise dictionary definition generator. For each term provided, respond with only the term and a concise, clear definition.
    - Use the format: "Term; Definition" (capitalize the first letter of both the term and the definition).
    - Ensure no terms from the input are skipped.
    - Provide precise and accurate definitions directly derived from authoritative sources.
    - Do not include introductions, examples, or explanations beyond the term and its definition.
    - Respond strictly with each term and its definition in the format: "Term; Definition" on separate lines`,
  };

  const askOllama = useCallback(async () => {
    if (!question.trim()) {
      setAnswer('Please enter a question.');
      return;
    }

    const prompt =
      promptType === 'preMade'
        ? preMadePrompts.dictionaryToCSV
        : promptType === 'custom'
        ? customPrompt
        : question;

    // Start by setting up the basic payload
    const requestPayload: any = {
      model: 'llama3.2-vision',
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nThe user input is:\n'${question}`,
        },
      ],
      stream: false,
    };

    const sendRequest = async (payload: any) => {
      setLoading(true);
      try {
        const { data } = await axios.post(apiUrl, payload);
        setAnswer(data?.message?.content || 'Unexpected response format from the server.');
      } catch (error) {
        setAnswer(`Request failed: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
      } finally {
        setLoading(false);
      }
    };

    // If there is an uploaded image, convert it to base64 and add it to the payload
    if (uploadedImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = (reader.result as string).split(',')[1]; // Get the part after the comma

        if (base64Image.length < 10) {
          console.error("Error: The base64 image data seems to be invalid or too short.");
        }

        // Construct the request payload with the base64 image data
        const requestPayloadWithImage = {
          ...requestPayload,
          images: [base64Image], // Use an array to send the base64 image
        };

        // Send the request
        sendRequest(requestPayloadWithImage);
      };

      reader.onerror = (error) => {
        console.error("Error reading image:", error);
      };

      reader.readAsDataURL(uploadedImage);
    } else {
      // If no image is uploaded, send the regular request
      sendRequest(requestPayload);
    }
  }, [question, promptType, customPrompt, uploadedImage]);

  const saveAnswerAsFile = useCallback(() => {
    if (!answer || answer === 'Definition will be shown here.' || answer === 'Please enter a question.') {
      setAnswer('Please ask a question first!');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileContent: string;

    if (promptType === 'preMade') {
      // CSV Format for Pre-made prompts
      const csvContent = ['term,definition', ...answer
        .split('\n')
        .filter(line => line.includes(';'))
        .map(line => {
          const [term, definition] = line.split(';').map(part => part.trim());
          return `"${term}","${definition}"`;
        }),
      ];

      fileContent = csvContent.join('\n');
      saveAs(new Blob([fileContent], { type: 'text/csv;charset=utf-8' }), `answer_${timestamp}.csv`);
    } else {
      fileContent = answer;

      saveAs(new Blob([fileContent], { type: 'text/plain;charset=utf-8' }), `answer_${timestamp}.txt`);
    }
  }, [answer, promptType]);

  const copyToClipboard = useCallback(() => {
    if (answer && answer !== 'Definition will be shown here.' && answer !== 'Please enter a question.') {
      navigator.clipboard.writeText(answer);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [answer]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setUploadedImage(event.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-800 text-gray-100">
      <div className="max-w-xl w-full bg-gray-900 shadow-xl rounded-xl p-8 relative overflow-hidden">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-indigo-600">DocAI Toolbox 🛠️</h1>

        <div className="mb-4">
          <label className="block text-xl font-medium mb-2">Choose Prompt Type:</label>
          <select
            value={promptType}
            onChange={(e) => setPromptType(e.target.value as 'preMade' | 'custom' | 'none')}
            className="w-full p-3 border border-gray-600 rounded-lg mb-4 bg-gray-800 text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="none">Classic</option>
            <option value="preMade">Dictionary to CSV</option>
            <option value="custom">Custom Prompt</option>
          </select>

          {promptType === 'custom' && (
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full p-3 order border-gray-600 rounded-lg mb-4 bg-gray-800 text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your custom prompt here..."
            ></textarea>
          )}
        </div>

        <label className="block text-xl font-medium mb-2">Enter a word or phrase to define:</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full p-3 rounded-lg mb-6 bg-gray-800 text-white focus:ring-2 focus:ring-indigo-500"
          placeholder="Type your question here..."
        />

        {/* File Upload */}
        <div className="mb-6">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="file:bg-indigo-600 file:border-0 file:border-indigo-600 file:text-white file:px-6 file:py-2 file:rounded-lg file:font-medium file:cursor-pointer hover:file:bg-indigo-700"
          />
        </div>

        {/* Button Row: evenly distributed */}
        <div className="flex justify-between items-center space-x-4 mb-6">
          <button
            onClick={askOllama}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 shadow-md flex-1"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Submit'}
          </button>
          <button
            onClick={copyToClipboard}
            className={`bg-gray-700 text-white px-6 py-2 rounded-lg font-medium shadow-md focus:ring-2 focus:ring-green-500 flex-1`}
          >
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={saveAnswerAsFile}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 shadow-md flex-1"
          >
            {promptType === 'preMade' ? 'Download CSV' : 'Download TXT'}
          </button>
        </div>

        <div
          className="mt-6 p-6 bg-gray-700 border border-gray-600 rounded-lg whitespace-pre-wrap overflow-y-auto max-h-96 text-gray-100"
        >
          {answer}
        </div>
      </div>
    </div>
  );
};

export default App;
