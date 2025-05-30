"use client"

import { ChakraProvider } from "@chakra-ui/react"
import system from "../../theme"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider system={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}
