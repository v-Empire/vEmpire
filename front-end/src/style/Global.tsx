
import { PancakeTheme } from 'components/theme'
import { createGlobalStyle } from 'styled-components'
// eslint-disable-next-line import/no-unresolved

declare module 'styled-components' {
  /* eslint-disable @typescript-eslint/no-empty-interface */
  export interface DefaultTheme extends PancakeTheme { }
}

const GlobalStyle = createGlobalStyle`
  * {
    font-family: 'Kanit', sans-serif;
  }
  h2{
      color:black !important;
    }
  body {
    background-color: ${({ theme }) => theme.colors.background};

    img {
      height: auto;
      max-width: 100%;
    }
    
  }
  input{
    margin-right:20px;
  }
  `
  // button{
  //   border-radius : 0px 20px 0 20px !important;
  //   box-shadow:2px 2px 10px rgba(0,0,0,0.5) !important;
  // }
  // a{
  //   padding:2px;
  //   border-radius : 0px 10px 0 10px !important;
  //   box-shadow:2px 2px 10px rgba(0,0,0,0.5) !important;
  // }
  
export default GlobalStyle
