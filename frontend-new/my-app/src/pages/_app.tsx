import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import Sidebar from "../components/Sidebar";
import { Flex, Box } from "@chakra-ui/react";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Flex h="100vh">
        <Sidebar />
        <Box flex="1" overflow="auto">
          <Component {...pageProps} />
        </Box>
      </Flex>
    </ChakraProvider>
  );
}
