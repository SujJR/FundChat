import { useState, useEffect, useRef } from 'react';
import { 
  Box, VStack, Heading, Text, Flex, Button, Spinner, 
  Tooltip, IconButton, Badge, 
  Input, InputGroup,
  useDisclosure, Collapse
} from '@chakra-ui/react';
import { Divider } from '@chakra-ui/layout';
import { InputLeftElement } from '@chakra-ui/input';
import { ScaleFade } from '@chakra-ui/transition';
import { useColorModeValue } from '@chakra-ui/color-mode';
import { useRouter } from 'next/router';
import { FiHome, FiFolder, FiPlus, FiRefreshCw, FiDatabase, FiSearch, FiFilter } from 'react-icons/fi';
import { fetchFunds } from '../api/funds';
import FileUploadModal from './FileUploadModal';

interface Fund {
  fund_id: string;
  fund_name: string;
  document_count: number;
}

const Sidebar = () => {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [filteredFunds, setFilteredFunds] = useState<Fund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovering, setIsHovering] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { isOpen: isUploadModalOpen, onOpen: onOpenUploadModal, onClose: onCloseUploadModal } = useDisclosure();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dynamic colors using Chakra color modes
  const bgGradient = useColorModeValue(
    'linear(to-b, white, gray.50)',
    'linear(to-b, gray.800, gray.900)'
  );
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headingColor = useColorModeValue('blue.600', 'blue.300');
  const highlightBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const activeColor = useColorModeValue('blue.700', 'blue.300');
  const cardBg = useColorModeValue('white', 'gray.800');

    const loadFunds = async () => {
      try {
      setIsLoading(true);
        const data = await fetchFunds();
      const fundsData = data.funds || [];
      setFunds(fundsData);
      setFilteredFunds(fundsData);
      } catch (error) {
        console.error("Failed to load funds:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
  useEffect(() => {
    loadFunds();
    
    // Add polling to refresh funds list periodically
    const intervalId = setInterval(() => {
      loadFunds();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Filter funds based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFunds(funds);
    } else {
      const filtered = funds.filter(fund => 
        fund.fund_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFunds(filtered);
    }
  }, [searchTerm, funds]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Ctrl+K or Command+K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress as any);
    return () => {
      document.removeEventListener('keydown', handleKeyPress as any);
    };
  }, []);

  return (
    <Box
      w="280px"
      h="100%"
      bgGradient={bgGradient}
      borderRight="1px"
      borderColor={borderColor}
      p={4}
      boxShadow="sm"
      position="relative"
      transition="all 0.3s"
      onKeyDown={handleKeyPress as any}
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Header section */}
      <Box flex="0 0 auto">
        <Flex align="center" justify="flex-start" mb={4}>
          <Box 
            bg="blue.500" 
            color="white" 
            borderRadius="lg" 
            p={2}
            mr={2}
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="md"
            transform="rotate(-5deg)"
          >
            <FiDatabase size={18} />
          </Box>
          <Heading size="md" color={headingColor} letterSpacing="tight" fontWeight="extrabold">
            FundChat
          </Heading>
        </Flex>
        
        <Divider mb={4} />
        
        <Box mb={4}>
          <Box
            as="a"
            onClick={() => router.push('/')}
            cursor="pointer"
            onMouseEnter={() => setIsHovering('home')}
            onMouseLeave={() => setIsHovering(null)}
          >
            <Flex
              p={2.5}
              borderRadius="lg"
              align="center"
              bg={router.pathname === '/' ? highlightBg : "transparent"}
              color={router.pathname === '/' ? activeColor : textColor}
              _hover={{ bg: hoverBg, transform: 'translateX(5px)' }}
              transition="all 0.2s"
              boxShadow={router.pathname === '/' ? 'sm' : 'none'}
            >
              <Box 
                mr={3} 
                transform={isHovering === 'home' ? 'scale(1.1)' : 'scale(1)'}
                transition="transform 0.2s"
              >
                <FiHome />
              </Box>
              <Text fontWeight="medium">Home</Text>
            </Flex>
          </Box>
        </Box>
        
          <Flex justify="space-between" align="center" mb={3}>
          <Text fontWeight="bold" color={textColor} fontSize="sm" textTransform="uppercase" letterSpacing="wide">
            Funds
          </Text>
          <Flex gap={2}>
            <Tooltip label="Refresh funds" placement="top">
              <IconButton
                aria-label="Refresh funds" 
                size="sm"
                variant="ghost"
                icon={<FiRefreshCw />}
                onClick={loadFunds}
                isDisabled={isLoading}
                colorScheme="blue"
                _hover={{ bg: hoverBg }}
              />
            </Tooltip>
            <Button 
              size="sm" 
              colorScheme="blue"
              variant="solid" 
              onClick={onOpenUploadModal}
              leftIcon={<FiPlus />}
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
              transition="all 0.2s"
              boxShadow="sm"
            >
              New
            </Button>
          </Flex>
        </Flex>
        
        <InputGroup size="sm" mb={4}>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            ref={searchInputRef}
            placeholder="Search funds... (Ctrl+K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            borderRadius="full"
            bg={cardBg}
            _focus={{ 
              boxShadow: 'outline',
              borderColor: 'blue.300'
            }}
          />
        </InputGroup>
      </Box>
      
      {/* Scrollable funds list */}
      <Box 
        flex="1 1 auto"
        overflowY="auto"
        minHeight="0" // This is crucial for proper scrolling behavior
        pr={1}
        mb={4}
        sx={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
            background: useColorModeValue('rgba(0,0,0,0.02)', 'rgba(255,255,255,0.02)'),
          },
          '&::-webkit-scrollbar-thumb': {
            background: useColorModeValue('rgba(0,0,0,0.2)', 'rgba(255,255,255,0.2)'),
            borderRadius: '24px',
          },
        }}
      >
          {isLoading ? (
          <Flex justify="center" p={4} direction="column" align="center">
            <Spinner size="sm" color="blue.500" thickness="3px" mb={2} speed="0.65s" />
            <Text fontSize="xs" color="gray.500">Loading funds...</Text>
          </Flex>
          ) : (
          <VStack 
            align="stretch" 
            spacing={2.5}
          >
            {filteredFunds.length === 0 && (
              <Flex 
                direction="column" 
                align="center" 
                justify="center" 
                p={6} 
                borderRadius="lg" 
                bg={cardBg}
                borderWidth="1px"
                borderStyle="dashed"
                borderColor={borderColor}
              >
                {searchTerm ? (
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    No funds matching "{searchTerm}"
                  </Text>
                ) : (
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    No funds available. Click "New" to create your first fund.
                  </Text>
                )}
              </Flex>
            )}
            
            {filteredFunds.map((fund) => (
              <ScaleFade key={fund.fund_id} in={true} initialScale={0.9}>
                <Box
                  as="a"
                  onClick={() => router.push(`/fund/${fund.fund_id}`)}
                  cursor="pointer"
                  onMouseEnter={() => setIsHovering(fund.fund_id)}
                  onMouseLeave={() => setIsHovering(null)}
                >
                    <Flex
                    p={3}
                    borderRadius="lg"
                      align="center"
                    bg={router.asPath === `/fund/${fund.fund_id}` ? highlightBg : cardBg}
                    color={router.asPath === `/fund/${fund.fund_id}` ? activeColor : textColor}
                    _hover={{ 
                      bg: router.asPath === `/fund/${fund.fund_id}` ? highlightBg : hoverBg,
                      transform: 'translateX(3px)'
                    }}
                    transition="all 0.2s"
                    boxShadow={router.asPath === `/fund/${fund.fund_id}` ? 'md' : 'sm'}
                    borderWidth="1px"
                    borderColor={router.asPath === `/fund/${fund.fund_id}` ? 'blue.200' : borderColor}
                    position="relative"
                    overflow="hidden"
                  >
                    {router.asPath === `/fund/${fund.fund_id}` && (
                      <Box 
                        position="absolute" 
                        left="0" 
                        top="0" 
                        bottom="0" 
                        width="3px" 
                        bg="blue.500"
                      />
                    )}
                    <Box 
                      mr={3} 
                      color={router.asPath === `/fund/${fund.fund_id}` ? "blue.500" : "gray.400"}
                      transform={isHovering === fund.fund_id ? 'scale(1.1)' : 'scale(1)'}
                      transition="all 0.2s"
                    >
                      <FiFolder />
                    </Box>
                    <Box flex="1">
                        <Text fontWeight="medium" noOfLines={1}>{fund.fund_name}</Text>
                      <Flex align="center" mt={1}>
                        <Badge 
                          size="sm" 
                          colorScheme="blue" 
                          variant="subtle" 
                          px={1.5} 
                          borderRadius="full"
                          boxShadow="inner"
                        >
                          {fund.document_count} {fund.document_count === 1 ? 'document' : 'documents'}
                        </Badge>
                      </Flex>
                      </Box>
                    </Flex>
                </Box>
              </ScaleFade>
            ))}
            </VStack>
          )}
        </Box>

      {/* Footer section */}
      <Box flex="0 0 auto" pt={2} borderTop="1px" borderColor={borderColor} opacity={0.8}>
        <Text fontSize="xs" color="gray.500" textAlign="center">
          FundChat v1.0
        </Text>
      </Box>

      <FileUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={onCloseUploadModal} 
        onSuccess={() => {
          // Force a refresh after upload with a slight delay to ensure backend processing
          setTimeout(loadFunds, 1000);
        }} 
      />
    </Box>
  );
};

export default Sidebar;
