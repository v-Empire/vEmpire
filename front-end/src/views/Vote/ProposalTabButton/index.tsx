import React from 'react'
import styled from 'styled-components'
import { useRouteMatch, Link } from 'react-router-dom'
import { ButtonMenu, ButtonMenuItem, Text, Toggle } from '@pancakeswap-libs/uikit'
import useI18n from 'hooks/useI18n';

const ProposalTabButton = () => {
  const { url, isExact } = useRouteMatch()
  const TranslateString = useI18n()



  return (
    <Wrapper>
      <ButtonMenu activeIndex={isExact ? 0 : 1} >
        <ButtonMenuItem as={Link} to={`${url}`} >
          Vote Now
        </ButtonMenuItem>
        {/* <span style={{ padding: '20px' }} /> */}
        <ButtonMenuItem as={Link} to={`${url}/community`}>
          Community
        </ButtonMenuItem>
      </ButtonMenu>
    </Wrapper>
  )
}

export default ProposalTabButton

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 32px;
`

const ToggleWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 32px;

  ${Text} {
    margin-left: 8px;
  }
`