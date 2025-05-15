import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
  HStack,
  Badge,
  useDisclosure
} from '@chakra-ui/react';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton } from '@chakra-ui/modal';
import { useColorModeValue } from '@chakra-ui/color-mode';
import { ScaleFade } from '@chakra-ui/transition';
import { Tag } from '@chakra-ui/tag';
import { Tooltip } from '@chakra-ui/tooltip';
import { Progress } from '@chakra-ui/progress';
import { FiUpload, FiFile, FiX, FiCheckCircle, FiAlertCircle, FiBarChart2 } from 'react-icons/fi';
import { uploadDocument } from '../api/funds';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FileUploadModal = ({ isOpen, onClose, onSuccess }: FileUploadModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fundName, setFundName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  
  // Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.200');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const dropzoneBg = useColorModeValue('gray.50', 'gray.700');
  const cardBg = useColorModeValue('white', 'gray.700');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setFiles(prev => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFiles([]);
    setFundName('');
    setUploadProgress(0);
    setUploadStatus('idle');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    switch(extension) {
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
        return '📋';
    }
  };

  const handleSubmit = async () => {
    if (!fundName.trim()) {
      alert('Please enter a fund name');
      return;
    }

    if (files.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(10); // Start progress indicator
    
    const formData = new FormData();
    formData.append('fund_name', fundName);
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      // Simulate upload progress (since axios doesn't have built-in progress for FormData)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 8;
          return newProgress >= 90 ? 90 : newProgress; // Cap at 90% until actual completion
        });
      }, 500);
      
      await uploadDocument(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');
      
      setTimeout(() => {
        onSuccess(); // Call the success callback
        onClose();
        resetForm(); // Reset the form
      }, 1000);
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      setUploadStatus('error');
      setIsUploading(false);
      
      // Let the error state be visible for a short time before resetting
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    }
  };

  // Drag and drop functionality
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileArray = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...fileArray]);
      e.dataTransfer.clearData();
    }
  }, []);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {
        if (!isUploading) {
          onClose();
          resetForm();
        }
      }}
      motionPreset="slideInBottom"
    >
      <ModalOverlay backdropFilter="blur(2px)" />
      <ModalContent 
        borderRadius="lg" 
        boxShadow="xl"
        bg={bgColor}
      >
        <ModalHeader 
          borderBottomWidth="1px" 
          borderColor={borderColor} 
          py={4}
          color={textColor}
        >
          <Flex align="center">
            <Icon as={FiBarChart2} mr={2} color="blue.500" />
            Create New Fund
          </Flex>
        </ModalHeader>
        <ModalCloseButton disabled={isUploading} />
        
        <ModalBody py={6}>
          <VStack gap={8}>
            <FormControl isRequired>
              <FormLabel fontWeight="medium" color={textColor}>Fund Name</FormLabel>
              <Input 
                placeholder="Enter fund name"
                value={fundName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFundName(e.target.value)}
                disabled={isUploading}
                bg={cardBg}
                borderColor={borderColor}
                borderRadius="md"
                _focus={{
                  borderColor: 'blue.400',
                  boxShadow: 'outline',
                }}
                size="md"
                autoFocus
              />
            </FormControl>

            <FormControl>
              <FormLabel fontWeight="medium" color={textColor}>
                Upload Documents
                <Badge ml={2} colorScheme="blue" fontSize="xs">
                  {files.length} selected
                </Badge>
              </FormLabel>
              <Box
                border="2px dashed"
                borderColor={borderColor}
                borderRadius="md"
                p={8}
                textAlign="center"
                bg={dropzoneBg}
                transition="all 0.2s"
                _hover={{
                  borderColor: 'blue.400',
                }}
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload">
                  <Button
                    as="span"
                    colorScheme="blue"
                    variant="outline"
                    mb={4}
                    disabled={isUploading}
                    size="md"
                    boxShadow="sm"
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: 'md',
                    }}
                    transition="all 0.2s"
                  >
                    <FiUpload style={{ marginRight: '8px' }} /> Select Files
                  </Button>
                </label>
                <Text fontSize="sm" color={mutedColor}>
                  Drag and drop files here or click to select
                </Text>
              </Box>
            </FormControl>

            {files.length > 0 && (
              <ScaleFade initialScale={0.9} in={true}>
                <Box w="100%">
                  <Text mb={3} fontWeight="medium" color={textColor}>
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                  </Text>
                  <VStack align="stretch" gap={3} maxH="200px" overflowY="auto" pr={2}
                    style={{
                      "&::-webkit-scrollbar": {
                        width: '4px',
                      },
                      "&::-webkit-scrollbar-track": {
                        width: '6px',
                      },
                      "&::-webkit-scrollbar-thumb": {
                        background: useColorModeValue('gray.300', 'gray.600'),
                        borderRadius: '24px',
                      },
                    }}
                  >
                    {files.map((file, index) => (
                      <Flex
                        key={index}
                        justify="space-between"
                        align="center"
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor={borderColor}
                        bg={cardBg}
                        boxShadow="sm"
                        transition="all 0.2s"
                        _hover={{
                          transform: 'translateY(-2px)',
                          boxShadow: 'md',
                        }}
                      >
                        <Flex align="center" maxW="calc(100% - 36px)">
                          <Box fontSize="xl" mr={3}>
                            {getFileIcon(file.name)}
                          </Box>
                          <Box>
                            <Text fontWeight="medium" fontSize="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </Text>
                            <HStack gap={2} mt={1}>
                              <Tag size="sm" colorScheme="blue" variant="subtle">
                                {file.name.split('.').pop()?.toUpperCase()}
                              </Tag>
                              <Text fontSize="xs" color={mutedColor}>
                                {formatFileSize(file.size)}
                              </Text>
                            </HStack>
                          </Box>
                        </Flex>
                        <Tooltip label="Remove file" placement="left">
                          <IconButton
                            aria-label="Remove file"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                          >
                            <FiX />
                          </IconButton>
                        </Tooltip>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              </ScaleFade>
            )}

            {uploadStatus !== 'idle' && (
              <ScaleFade initialScale={0.9} in={true}>
                <Box w="100%" bg={cardBg} p={4} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                  <Flex align="center" mb={2} justify="space-between">
                    <HStack>
                      {uploadStatus === 'uploading' && <Text fontWeight="medium">Uploading</Text>}
                      {uploadStatus === 'success' && (
                        <HStack>
                          <Icon as={FiCheckCircle} color="green.500" />
                          <Text fontWeight="medium" color="green.500">Upload Complete</Text>
                        </HStack>
                      )}
                      {uploadStatus === 'error' && (
                        <HStack>
                          <Icon as={FiAlertCircle} color="red.500" />
                          <Text fontWeight="medium" color="red.500">Upload Failed</Text>
                        </HStack>
                      )}
                    </HStack>
                    <Text fontWeight="medium">
                      {Math.round(uploadProgress)}%
                    </Text>
                  </Flex>
                  <Progress 
                    value={uploadProgress} 
                    size="sm" 
                    colorScheme={uploadStatus === 'error' ? 'red' : 'blue'} 
                    borderRadius="full"
                    hasStripe={uploadStatus === 'uploading'}
                    isAnimated={uploadStatus === 'uploading'}
                  />
                </Box>
              </ScaleFade>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor={borderColor}>
          <Button 
            variant="outline" 
            mr={3} 
            onClick={onClose} 
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            disabled={isUploading || files.length === 0 || !fundName.trim()}
            loading={isUploading}
            loadingText="Uploading..."
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'md',
            }}
            transition="all 0.2s"
          >
            <FiUpload style={{ marginRight: '8px' }} /> Upload
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FileUploadModal;
