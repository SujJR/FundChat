import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  Button,
  Spinner,
  Flex,
  Icon,
  useColorModeValue,
  Divider,
  Code,
} from '@chakra-ui/react';
import { FiFileText, FiDownload, FiExternalLink } from 'react-icons/fi';
import { getDocumentContent } from '../api/documents';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  fileName: string;
  fileType: string;
}

const DocumentViewer = ({ isOpen, onClose, documentId, fileName, fileType }: DocumentViewerProps) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const codeBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument();
    }
  }, [isOpen, documentId]);

  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getDocumentContent(documentId);
      setContent(data.content);
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document content. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    // Show different icons based on file type
    switch(fileType.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📑';
      default:
        return '📄';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(2px)" />
      <ModalContent maxW="900px" maxH="85vh">
        <ModalHeader borderBottomWidth="1px" borderColor={borderColor} py={4}>
          <Flex align="center">
            <Box fontSize="2xl" mr={3}>
              {getFileIcon(fileType)}
            </Box>
            <Box>
              <Text fontWeight="bold" fontSize="lg">{fileName}</Text>
              <Text fontSize="sm" color="gray.500">
                Document Type: {fileType.toUpperCase()}
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody p={0}>
          {isLoading ? (
            <Flex direction="column" align="center" justify="center" h="400px">
              <Spinner size="xl" color="blue.500" mb={4} />
              <Text>Loading document content...</Text>
            </Flex>
          ) : error ? (
            <Flex direction="column" align="center" justify="center" h="400px">
              <Icon as={FiFileText} boxSize={12} color="red.500" mb={4} />
              <Text color="red.500" fontWeight="medium" mb={2}>Error</Text>
              <Text>{error}</Text>
              <Button mt={4} onClick={loadDocument} colorScheme="blue">
                Try Again
              </Button>
            </Flex>
          ) : (
            <Box p={6} position="relative">
              <Box
                p={4}
                borderWidth="1px"
                borderRadius="md"
                borderColor={borderColor}
                bg={codeBg}
                fontFamily="monospace"
                fontSize="sm"
                whiteSpace="pre-wrap"
                overflowX="auto"
                className="document-content"
                sx={{
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    width: '10px',
                    backgroundColor: useColorModeValue('gray.100', 'gray.800'),
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: useColorModeValue('gray.300', 'gray.600'),
                    borderRadius: '24px',
                  },
                }}
              >
                {content}
              </Box>
            </Box>
          )}
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor={borderColor} justifyContent="space-between">
          <Text fontSize="sm" color="gray.500">
            Document ID: {documentId.substring(0, 8)}...
          </Text>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DocumentViewer; 