import { useState, useEffect } from 'react';
import { Box, Text, Heading, Button, Code, VStack, Badge, Spinner } from '@chakra-ui/react';
import axios from 'axios';

type ConnectionStatus = 'checking' | 'connected' | 'error';

const ApiDiagnostic = () => {
  const [apiEndpoint, setApiEndpoint] = useState<string>('');
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Get API URL from environment variable or use default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    setApiEndpoint(apiUrl);
    
    // Check connection
    testConnection(apiUrl);
  }, []);

  const testConnection = async (url: string) => {
    setStatus('checking');
    setErrorMessage(null);
    setResponseData(null);

    try {
      console.log(`Testing connection to ${url}`);
      const response = await axios.get(url, { timeout: 5000 });
      console.log('Connection successful:', response.data);
      setStatus('connected');
      setResponseData(response.data);
    } catch (error: any) {
      console.error('Connection error:', error);
      setStatus('error');
      if (error.code === 'ECONNREFUSED') {
        setErrorMessage('Connection refused. Is the backend server running?');
      } else if (error.message.includes('timeout')) {
        setErrorMessage('Connection timed out. The server might be slow or unavailable.');
      } else if (error.response) {
        setErrorMessage(`Server responded with status ${error.response.status}: ${error.response.statusText}`);
      } else {
        setErrorMessage(`Error: ${error.message}`);
      }
    }
  };

  const retryConnection = () => {
    testConnection(apiEndpoint);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  if (!isVisible) {
    return (
      <Button 
        position="fixed" 
        bottom="10px" 
        right="10px" 
        colorScheme={status === 'connected' ? 'green' : status === 'error' ? 'red' : 'blue'} 
        size="sm"
        onClick={toggleVisibility}
      >
        Show API Status
      </Button>
    );
  }

  return (
    <Box
      position="fixed"
      bottom="10px"
      right="10px"
      bg="white"
      boxShadow="md"
      borderRadius="md"
      p={4}
      maxWidth="350px"
      zIndex={9999}
      border="1px solid"
      borderColor={status === 'connected' ? 'green.200' : status === 'error' ? 'red.200' : 'blue.200'}
    >
      <VStack align="stretch" spacing={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="sm">API Connection Status</Heading>
          <Button size="xs" onClick={toggleVisibility}>Hide</Button>
        </Box>
        
        <Box>
          <Text fontSize="sm" fontWeight="bold">Endpoint:</Text>
          <Code fontSize="xs" p={1} borderRadius="md" whiteSpace="nowrap" overflow="auto">
            {apiEndpoint}
          </Code>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Text fontSize="sm" fontWeight="bold">Status:</Text>
          {status === 'checking' && <Spinner size="xs" />}
          <Badge colorScheme={status === 'connected' ? 'green' : status === 'error' ? 'red' : 'blue'}>
            {status === 'connected' ? 'Connected' : status === 'error' ? 'Error' : 'Checking...'}
          </Badge>
        </Box>
        
        {errorMessage && (
          <Box>
            <Text fontSize="sm" fontWeight="bold" color="red.500">Error:</Text>
            <Text fontSize="xs" color="red.500">{errorMessage}</Text>
          </Box>
        )}
        
        {responseData && (
          <Box>
            <Text fontSize="sm" fontWeight="bold">Response:</Text>
            <Code fontSize="xs" p={1} borderRadius="md" whiteSpace="pre-wrap" maxHeight="100px" overflow="auto">
              {JSON.stringify(responseData, null, 2)}
            </Code>
          </Box>
        )}
        
        <Button size="sm" colorScheme="blue" onClick={retryConnection}>
          Test Connection
        </Button>
      </VStack>
    </Box>
  );
};

export default ApiDiagnostic;