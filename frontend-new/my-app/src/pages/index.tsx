import ChatInterface from '../components/ChatInterface';
import { Box, Flex, Heading, Text } from '@chakra-ui/react';

export default function Home() {
  return (
    <Box h="100%">
      <Box p={4} borderBottom="1px" borderColor="gray.200" bg="white">
        <Heading size="lg">FundChat</Heading>
        <Text color="gray.600" mt={1}>
          Ask questions about your investment funds
        </Text>
      </Box>
      <Box h="calc(100% - 100px)">
        <ChatInterface />
      </Box>
    </Box>
  );
}
