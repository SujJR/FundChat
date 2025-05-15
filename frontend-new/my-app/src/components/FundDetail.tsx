import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, Heading, Text, Divider, VStack, HStack, Badge,
  Spinner, Button, Flex, Icon, IconButton, 
  AlertDialog, AlertDialogBody, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  useDisclosure, useToast, Tab, TabList, TabPanel, TabPanels,
  Tabs, useColorModeValue, Avatar, Tag, Tooltip, Input, InputGroup, InputLeftElement
} from '@chakra-ui/react';
import { FiFileText, FiMessageSquare, FiTrash2, FiCalendar, FiFile, FiInfo, FiArrowLeft, FiSearch } from 'react-icons/fi';
import { fetchFundDetails, deleteFund } from '../api/funds';
import ChatInterface from './ChatInterface';
import React from 'react';

interface Document {
  file_name: string;
  file_type: string;
  created_at: string;
  document_id?: string;
}

interface Fund {
  fund_id: string;
  fund_name: string;
  summary: string;
  document_count: number;
  created_at: string;
  documents: Document[];
}

const FormattedText = ({ text }: { text: string }) => {
  // Split text by double line breaks (paragraphs)
  const paragraphs = text.split(/\n\s*\n/);
  
  // Function to handle Markdown formatting
  const formatMarkdown = (text: string) => {
    // Handle bold text (**text**)
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text (*text*)
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return formattedText;
  };
  
  // Function to detect and style bullet points or list items
  const formatLine = (line: string) => {
    // Pre-process line to handle Markdown formatting for displaying in JSX
    const processedLine = formatMarkdown(line);
    
    // Handle bullet points (•, -, *, etc.)
    if (line.match(/^\s*[\•\-\*]\s+/)) {
      return (
        <Text 
          as="li" 
          pl={2} 
          ml={4} 
          mb={3} 
          dangerouslySetInnerHTML={{ __html: processedLine.replace(/^\s*[\•\-\*]\s+/, '') }}
        />
      );
    }
    
    // Handle numbered lists (1., 2., etc.)
    if (line.match(/^\s*\d+\.\s+/)) {
      return (
        <Text 
          as="li" 
          pl={2} 
          ml={4} 
          mb={3} 
          listStyleType="decimal"
          dangerouslySetInnerHTML={{ __html: processedLine.replace(/^\s*\d+\.\s+/, '') }}
        />
      );
    }
    
    // Handle section headers or emphasized lines (often with colon)
    if (line.match(/^[A-Z][A-Za-z\s]+:/) && line.length < 50) {
      return (
        <Text 
          as="strong" 
          fontWeight="bold" 
          display="block"
          mb={2}
          mt={3}
          fontSize="1.05em"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    }
    
    // Regular text
    return <span dangerouslySetInnerHTML={{ __html: processedLine }} />;
  };
  
  return (
    <>
      {paragraphs.map((paragraph, idx) => {
        // Check if paragraph looks like a list
        const lines = paragraph.split('\n');
        const isList = lines.length > 1 && 
          lines.filter(line => line.match(/^\s*[\•\-\*]\s+/) || line.match(/^\s*\d+\.\s+/)).length > 1;
        
        if (isList) {
          return (
            <Box as="ul" mb={5} key={idx} pl={4}>
              {lines.map((line, lineIdx) => (
                <React.Fragment key={lineIdx}>
                  {formatLine(line)}
                </React.Fragment>
              ))}
            </Box>
          );
        }
        
        // Regular paragraph
        return (
          <Text 
            key={idx} 
            mb={4} 
            sx={{ 
              textIndent: '0',
              textAlign: 'left',
              hyphens: 'none'
            }}
          >
            {lines.map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {lineIdx > 0 && <br />}
                {formatLine(line)}
              </React.Fragment>
            ))}
          </Text>
        );
      })}
    </>
  );
};

const FundDetail = () => {
  const router = useRouter();
  const { fundId } = router.query;
  const [fund, setFund] = useState<Fund | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [documentSearch, setDocumentSearch] = useState<string>('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('blue.600', 'blue.300');

  useEffect(() => {
    const loadFundDetails = async () => {
      if (!fundId) return;
      
      setIsLoading(true);
      try {
        const data = await fetchFundDetails(fundId as string);
        setFund(data);
      } catch (error) {
        console.error("Failed to load fund details:", error);
        toast({
          title: "Error loading fund",
          description: "We couldn't load the fund details. Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (fundId) {
      loadFundDetails();
    }
  }, [fundId, toast]);

  // Filter documents based on search term
  useEffect(() => {
    if (!fund) return;
    
    if (!documentSearch.trim()) {
      setFilteredDocuments(fund.documents || []);
    } else {
      const searchTerm = documentSearch.toLowerCase();
      const filtered = (fund.documents || []).filter(doc => 
        doc.file_name.toLowerCase().includes(searchTerm) || 
        doc.file_type.toLowerCase().includes(searchTerm)
      );
      setFilteredDocuments(filtered);
    }
  }, [documentSearch, fund]);

  const handleDeleteFund = async () => {
    if (!fundId) return;
    
    setIsDeleting(true);
    try {
      await deleteFund(fundId as string);
      toast({
        title: "Fund deleted",
        description: "The fund has been successfully deleted.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      router.push('/');
    } catch (error) {
      console.error("Failed to delete fund:", error);
      toast({
        title: "Error",
        description: "Failed to delete the fund. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsDeleting(false);
    }
    onClose();
  };

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

  if (isLoading) {
    return (
      <Flex 
        h="100%" 
        justify="center" 
        align="center" 
        direction="column"
        bg={useColorModeValue('gray.50', 'gray.900')}
      >
        <Spinner 
          size="xl" 
          color="blue.500" 
          thickness="4px"
          speed="0.65s"
          emptyColor={useColorModeValue('gray.200', 'gray.700')}
          mb={4}
        />
        <Text color={subtleColor}>Loading fund details...</Text>
      </Flex>
    );
  }

  if (!fund) {
    return (
      <Flex 
        h="100%" 
        justify="center" 
        align="center" 
        direction="column"
        bg={useColorModeValue('gray.50', 'gray.900')}
        p={6}
      >
        <Box
          bg="red.50"
          p={5}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="red.200"
          mb={6}
          maxW="md"
          textAlign="center"
        >
          <Icon as={FiInfo} boxSize={8} color="red.500" mb={4} />
          <Heading size="md" mb={2} color="red.600">Fund Not Found</Heading>
          <Text mb={4} color={textColor}>
            The fund you're looking for doesn't exist or may have been deleted.
          </Text>
          <Button 
            colorScheme="blue" 
            leftIcon={<FiArrowLeft />}
            onClick={() => router.push('/')}
            boxShadow="md"
            _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
            transition="all 0.2s"
          >
            Back to Home
          </Button>
        </Box>
      </Flex>
    );
  }

  return (
    <Box h="100%" bg={useColorModeValue('gray.50', 'gray.900')} display="flex" flexDirection="column">
      <Box p={6} bg={bgColor} borderBottom="1px" borderColor={borderColor} boxShadow="sm">
        <Flex justify="space-between" align="center" mb={4}>
          <HStack spacing={4}>
            <Avatar 
              bg="blue.500" 
              color="white" 
              name={fund.fund_name} 
              size="md"
              fontWeight="bold"
            />
            <Box>
              <Heading size="lg">{fund.fund_name}</Heading>
              <HStack spacing={4} mt={1}>
                <Tag size="sm" colorScheme="blue" borderRadius="full" px={3}>
                  {fund.document_count} document{fund.document_count !== 1 ? 's' : ''}
                </Tag>
                <HStack spacing={1} color={subtleColor}>
                  <Icon as={FiCalendar} fontSize="sm" />
                  <Text fontSize="sm">
                    {new Date(fund.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </HStack>
              </HStack>
            </Box>
          </HStack>
          
          <Tooltip hasArrow label="Delete fund" placement="left">
            <IconButton
              aria-label="Delete fund"
              icon={<FiTrash2 />}
              colorScheme="red"
              variant="ghost"
              onClick={onOpen}
              isLoading={isDeleting}
              _hover={{ bg: 'red.50' }}
            />
          </Tooltip>
        </Flex>
        
        <Tabs 
          variant="soft-rounded" 
          colorScheme="blue"
          index={tabIndex}
          onChange={setTabIndex}
          mt={2}
        >
          <TabList>
            <Tab 
              _selected={{ color: 'white', bg: 'blue.500' }}
              _hover={{ bg: useColorModeValue('blue.50', 'blue.900') }}
            >
              <Icon as={FiFileText} mr={2} />
              Fund Info
            </Tab>
            <Tab 
              _selected={{ color: 'white', bg: 'blue.500' }}
              _hover={{ bg: useColorModeValue('blue.50', 'blue.900') }}
            >
              <Icon as={FiMessageSquare} mr={2} />
              Chat
            </Tab>
          </TabList>
        </Tabs>
      </Box>
      
      <Box p={6} overflowY="auto" flex="1">
        <Tabs variant="unstyled" index={tabIndex} onChange={setTabIndex}>
          <TabPanels>
            <TabPanel px={0}>
              <VStack align="stretch" spacing={8}>
                <Box 
                  bg={bgColor} 
                  p={6} 
                  borderRadius="lg" 
                  borderWidth="1px" 
                  borderColor={borderColor}
                  boxShadow="sm"
                >
                  <Heading size="md" mb={4} color={accentColor}>Summary</Heading>
                  <Box 
                    bg={cardBg}
                    p={6}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                    boxShadow="inner"
                    overflowY="auto"
                    maxHeight="500px"
                    sx={{
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        width: '8px',
                        background: useColorModeValue('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.05)'),
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: useColorModeValue('rgba(0,0,0,0.2)', 'rgba(255,255,255,0.2)'),
                        borderRadius: '24px',
                      },
                    }}
                  >
                    <Box
                      color={textColor} 
                      lineHeight="1.9"
                      fontSize="md"
                      fontFamily="Georgia, serif"
                      letterSpacing="0.015em"
                      maxWidth="100%"
                      mx="auto"
                      textAlign="left"
                    >
                      <FormattedText text={fund.summary} />
                    </Box>
                  </Box>
                </Box>
                
                <Box 
                  bg={bgColor} 
                  p={6} 
                  borderRadius="lg" 
                  borderWidth="1px" 
                  borderColor={borderColor}
                  boxShadow="sm"
                >
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="md" color={accentColor}>Documents</Heading>
                    <Badge 
                      colorScheme="blue" 
                      variant="solid" 
                      fontSize="sm" 
                      px={3} 
                      py={1} 
                      borderRadius="full"
                    >
                      {fund.document_count} {fund.document_count === 1 ? 'document' : 'documents'}
                    </Badge>
                  </Flex>
                  
                  {fund.documents && fund.documents.length > 0 ? (
                    <>
                      {fund.documents.length > 3 && (
                        <InputGroup mb={4} size="sm">
                          <InputLeftElement pointerEvents="none">
                            <Icon as={FiSearch} color="gray.400" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search documents..."
                            value={documentSearch}
                            onChange={(e) => setDocumentSearch(e.target.value)}
                            borderRadius="full"
                            bg={cardBg}
                            borderColor={borderColor}
                            _focus={{
                              borderColor: 'blue.300',
                              boxShadow: 'outline',
                            }}
                          />
                        </InputGroup>
                      )}
                      
                      {filteredDocuments.length > 0 ? (
                        <VStack align="stretch" spacing={4} maxH="400px" overflowY="auto" pr={2}
                          sx={{
                            '&::-webkit-scrollbar': {
                              width: '4px',
                            },
                            '&::-webkit-scrollbar-track': {
                              width: '6px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              background: useColorModeValue('gray.300', 'gray.600'),
                              borderRadius: '24px',
                            },
                          }}
                        >
                          {filteredDocuments.map((doc, index) => (
                            <Flex 
                              key={index} 
                              p={4} 
                              borderRadius="md" 
                              bg={cardBg}
                              borderWidth="1px"
                              borderColor={borderColor}
                              boxShadow="sm"
                              _hover={{ 
                                transform: 'translateY(-2px)', 
                                boxShadow: 'md',
                                borderColor: 'blue.200' 
                              }}
                              transition="all 0.2s"
                              cursor="pointer"
                            >
                              <Box 
                                mr={4} 
                                fontSize="2xl" 
                                bg={useColorModeValue('white', 'gray.800')} 
                                p={3}
                                borderRadius="md"
                                boxShadow="inner"
                                width="50px"
                                height="50px"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                              >
                                {getFileIcon(doc.file_type)}
                              </Box>
                              <Box flex="1">
                                <Text fontWeight="medium" color={textColor}>{doc.file_name}</Text>
                                <HStack spacing={4} mt={1}>
                                  <Tag size="sm" colorScheme="blue" variant="subtle" textTransform="uppercase">
                                    <HStack spacing={1}>
                                      <Icon as={FiFile} fontSize="xs" />
                                      <Text>{doc.file_type}</Text>
                                    </HStack>
                                  </Tag>
                                  <HStack spacing={1} fontSize="sm" color={subtleColor}>
                                    <Icon as={FiCalendar} fontSize="xs" />
                                    <Text>
                                      {new Date(doc.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </Text>
                                  </HStack>
                                </HStack>
                              </Box>
                            </Flex>
                          ))}
                        </VStack>
                      ) : (
                        <Flex 
                          direction="column" 
                          align="center" 
                          justify="center" 
                          py={10}
                          borderWidth="2px"
                          borderStyle="dashed"
                          borderColor={borderColor}
                          borderRadius="lg"
                          bg={cardBg}
                        >
                          <Icon as={FiSearch} boxSize={6} color={subtleColor} mb={3} />
                          <Text color={subtleColor} mb={3}>No documents match your search</Text>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            colorScheme="blue" 
                            onClick={() => setDocumentSearch("")}
                          >
                            Clear Search
                          </Button>
                        </Flex>
                      )}
                    </>
                  ) : (
                    <Flex 
                      direction="column" 
                      align="center" 
                      justify="center" 
                      py={10}
                      borderWidth="2px"
                      borderStyle="dashed"
                      borderColor={borderColor}
                      borderRadius="lg"
                      bg={cardBg}
                    >
                      <Icon as={FiFileText} boxSize={10} color={subtleColor} mb={4} />
                      <Text color={subtleColor} mb={4}>No documents available</Text>
                      <Button colorScheme="blue" size="sm">Upload Documents</Button>
                    </Flex>
                  )}
                </Box>
              </VStack>
            </TabPanel>
            
            <TabPanel px={0}>
              <Box 
                bg={bgColor} 
                borderRadius="lg" 
                borderWidth="1px" 
                borderColor={borderColor}
                boxShadow="sm"
                h="100%"
                overflow="hidden"
              >
                <ChatInterface fundId={fundId as string} />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef as React.RefObject<any>}
        onClose={onClose}
        motionPreset="slideInBottom"
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="lg" boxShadow="xl">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Fund
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete <Text as="span" fontWeight="bold">"{fund?.fund_name}"</Text>? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button 
                ref={cancelRef} 
                onClick={onClose}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteFund} 
                ml={3}
                isLoading={isDeleting}
                leftIcon={<FiTrash2 />}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default FundDetail;
