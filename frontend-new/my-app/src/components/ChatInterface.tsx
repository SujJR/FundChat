import { useState, useRef, useEffect } from 'react';
import { 
  Box, VStack, HStack, Input, Button, Text, Flex, IconButton, Avatar, Spinner, 
  Tooltip, Fade, InputGroup, InputRightElement, useColorModeValue,
  Divider, useToast, Icon, ScaleFade
} from '@chakra-ui/react';

import { FiSend, FiPaperclip, FiSmile, FiUser, FiMessageCircle, FiFile } from 'react-icons/fi';
import { sendChatMessage } from '../api/chat';
import { uploadChatAttachment } from '../api/documents';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'ai';
  timestamp: Date;
  attachment?: {
    filename: string;
    type: string;
  };
}

interface ChatInterfaceProps {
  fundId?: string;
}

const ChatInterface = ({ fundId }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Color modes
  const bgColor = useColorModeValue('white', 'gray.800');
  const userBubbleBg = useColorModeValue('blue.500', 'blue.600');
  const aiBubbleBg = useColorModeValue('gray.100', 'gray.700');
  const userTextColor = useColorModeValue('white', 'white');
  const aiTextColor = useColorModeValue('gray.800', 'gray.100');
  const subtleColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const inputBg = useColorModeValue('white', 'gray.700');
  const attachmentBg = useColorModeValue('blue.50', 'gray.700');

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus input on component mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(input, fundId);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.answer || response.response || "I'm sorry, I couldn't process your request.",
        role: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message as AI response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        role: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleAttachmentClick = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      // Upload the file
      const response = await uploadChatAttachment(file, fundId);
      
      // Create a message with the file content
      const fileContent = response.content || `[File: ${file.name}]`;
      const userMessage: Message = {
        id: Date.now().toString(),
        content: fileContent,
        role: 'user',
        timestamp: new Date(),
        attachment: {
          filename: file.name,
          type: file.type
        }
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // If we're in a fund chat, the file is automatically processed
      if (fundId) {
        // Add waiting message
        const processingMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Processing your uploaded document...",
          role: 'ai',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, processingMessage]);
        
        // Automatically send a query about the file
        setTimeout(async () => {
          try {
            const query = `Tell me about the document I just uploaded: ${file.name}`;
            const response = await sendChatMessage(query, fundId);
            
            const aiMessage: Message = {
              id: (Date.now() + 2).toString(),
              content: response.answer || response.response || "I've processed your document and can now answer questions about it.",
              role: 'ai',
              timestamp: new Date()
            };
            
            // Replace the processing message with the actual response
            setMessages(prev => [...prev.slice(0, prev.length - 1), aiMessage]);
          } catch (error) {
            console.error('Error sending message about upload:', error);
            // Update processing message with error
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                content: "There was an issue processing your document. You can still ask questions about it."
              };
              return newMessages;
            });
          }
        }, 2000);
      }
      
      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box h="100%" display="flex" flexDirection="column">
      <Box 
        p={4} 
        borderBottom="1px" 
        borderColor={borderColor}
        bg={bgColor}
      >
        <Flex align="center" gap={2}>
          <Avatar 
            size="sm" 
            bg="blue.500" 
            icon={<FiMessageCircle color="white" />} 
          />
          <Text fontSize="lg" fontWeight="bold">
            {fundId ? 'Fund Chat' : 'General Chat'}
          </Text>
        </Flex>
      </Box>

      <VStack 
        flex="1" 
        p={4} 
        spacing={6} 
        overflowY="auto"
        bg={useColorModeValue('gray.50', 'gray.900')}
        sx={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            width: '8px',
            background: useColorModeValue('gray.100', 'gray.800'),
          },
          '&::-webkit-scrollbar-thumb': {
            background: useColorModeValue('gray.300', 'gray.600'),
            borderRadius: '24px',
          },
        }}
      >
        {messages.length === 0 ? (
          <Flex 
            direction="column" 
            align="center" 
            justify="center" 
            h="100%" 
            color={subtleColor}
            textAlign="center"
            p={10}
          >
            <Box 
              as={FiMessageCircle} 
              size="40px" 
              mb={6} 
              opacity={0.6}
            />
            <Text fontSize="lg" fontWeight="medium" mb={2}>
              Start a new conversation
            </Text>
            <Text fontSize="sm" maxW="md">
              Ask questions about your fund documents, request financial data, or get insights about market trends.
            </Text>
          </Flex>
        ) : (
          messages.map((msg, index) => (
            <ScaleFade 
              key={msg.id} 
              initialScale={0.9} 
              in={true}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                width: 'auto'
              }}
            >
              <Flex 
                direction={msg.role === 'user' ? 'row-reverse' : 'row'} 
                align="flex-start"
              >
                {msg.role === 'ai' ? (
                  <Avatar 
                    size="sm" 
                    bg="blue.500" 
                    icon={<FiMessageCircle color="white" />} 
                    mr={2}
                  />
                ) : (
                  <Avatar 
                    size="sm" 
                    bg="gray.500" 
                    icon={<FiUser color="white" />} 
                    ml={2}
                  />
                )}
                <Box
                  bg={msg.role === 'user' ? userBubbleBg : aiBubbleBg}
                  color={msg.role === 'user' ? userTextColor : aiTextColor}
                  borderRadius="lg"
                  p={4}
                  boxShadow="sm"
                  borderWidth="1px"
                  borderColor={msg.role === 'user' ? 'blue.600' : borderColor}
                  maxWidth="100%"
                  position="relative"
                  _before={{
                    content: '""',
                    position: 'absolute',
                    top: '14px',
                    [msg.role === 'user' ? 'right' : 'left']: '-8px',
                    borderWidth: '8px',
                    borderStyle: 'solid',
                    borderColor: 'transparent',
                    [msg.role === 'user' ? 'borderRightColor' : 'borderLeftColor']: msg.role === 'user' ? userBubbleBg : aiBubbleBg,
                    transform: msg.role === 'user' ? 'rotate(180deg)' : 'none'
                  }}
                >
                  {msg.attachment && (
                    <Flex 
                      mb={2}
                      p={2}
                      bg={msg.role === 'user' ? 'blue.400' : attachmentBg}
                      borderRadius="md"
                      align="center"
                      fontSize="sm"
                    >
                      <Icon as={FiFile} mr={2} />
                      <Text fontWeight="medium" noOfLines={1}>
                        {msg.attachment.filename}
                      </Text>
                    </Flex>
                  )}
                  <Text whiteSpace="pre-wrap" fontSize="md">{msg.content}</Text>
                  <Text fontSize="xs" color={msg.role === 'user' ? 'blue.200' : subtleColor} mt={2} textAlign="right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Box>
              </Flex>
            </ScaleFade>
          ))
        )}
        {isLoading && (
          <ScaleFade initialScale={0.9} in={true} style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
            <Flex align="flex-start">
              <Avatar 
                size="sm" 
                bg="blue.500" 
                icon={<FiMessageCircle color="white" />} 
                mr={2}
              />
              <Box
                bg={aiBubbleBg}
                borderRadius="lg"
                p={4}
                boxShadow="sm"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <Flex align="center" justify="center" h="24px">
                  <Spinner size="sm" color="blue.500" mr={2} />
                  <Text fontSize="sm" color={subtleColor}>Thinking...</Text>
                </Flex>
              </Box>
            </Flex>
          </ScaleFade>
        )}
        <div ref={messagesEndRef} />
      </VStack>

      <Box p={4} bg={bgColor} borderTop="1px" borderColor={borderColor}>
        <InputGroup size="md">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            bg={inputBg}
            borderRadius="full"
            pr="4.5rem"
            borderWidth="1px"
            borderColor={borderColor}
            _focus={{
              borderColor: 'blue.300',
              boxShadow: 'outline',
            }}
            disabled={isLoading || isUploading}
          />
          <InputRightElement width="4.5rem">
            <HStack spacing={1} mr={1}>
              <Tooltip label="Attach file" placement="top">
                <IconButton
                  aria-label="Attach file"
                  icon={<FiPaperclip />}
                  size="sm"
                  variant="ghost"
                  isDisabled={isLoading || isUploading}
                  onClick={handleAttachmentClick}
                  colorScheme="blue"
                />
              </Tooltip>
              <Tooltip label="Send message" placement="top">
                <IconButton
                  aria-label="Send message"
                  icon={<FiSend />}
                  size="sm"
                  colorScheme="blue"
                  isDisabled={!input.trim() || isLoading || isUploading}
                  onClick={handleSendMessage}
                  borderRadius="full"
                />
              </Tooltip>
            </HStack>
          </InputRightElement>
        </InputGroup>
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".pdf,.txt,.doc,.docx,.csv,.xls,.xlsx"
        />
        
        <Text fontSize="xs" color={subtleColor} mt={2} textAlign="center">
          {isUploading ? "Uploading file..." : "Press Enter to send, or attach a file"}
        </Text>
      </Box>
    </Box>
  );
};

export default ChatInterface;
