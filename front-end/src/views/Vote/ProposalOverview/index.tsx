import React, { useState } from 'react'
import { Heading, Checkbox, Radio, ButtonMenu, ButtonMenuItem, Button, useModal } from '@pancakeswap-libs/uikit'
import FlexLayout from 'components/layout/Flex'
import Page from 'components/layout/Page'
import Divider from 'views/Farms/components/Divider'
import useI18n from 'hooks/useI18n'
import styled from 'styled-components'
import VoteTabButtons from '../VoteTabButtons'
import ProposalTabButton from '../ProposalTabButton'
import VoteNowModal from './VoteNowModal'

const Row = styled('div')`
  margin: 30px 0px;
  padding: 0;
`

const ProposalOverview = () => {

  const [voteNow] = useModal(<VoteNowModal />)

  return (

    <Page>
      <Heading as="h1" size="lg" color="primary">
        Voting
      </Heading>
      <Heading as="h2" color="secondary" mb="50px">
        Have you say in the future of the vEmpire <br /> ecosystem
      </Heading>

      <VoteTabButtons />
      <div style={{ marginTop: '50px' }}>
        <Divider />
        <div>
          <Heading as="h1" size="lg" color="primary">
            Proposals
          </Heading>
          <Row>
            <ProposalTabButton />
          </Row>
          <div>
            <Radio name="voting" /* selected="true" */ scale="sm" style={{ marginRight: '10px' }} />
            Vote Now
            <Radio name="voting" scale="sm" style={{ margin: '0px 10px' }} />
            Closed
          </div>
          <Row>
            <Heading as="h1" size="lg" color="primary" style={{ marginBottom: '30px' }}>
              Proposal 1...
            </Heading>
            <p style={{ marginBottom: '30px' }}>End Oct, 12th 2022 9:00PM</p>
            <Button onClick={voteNow}>Vote Now</Button>
          </Row>
        </div>
      </div>
      <div style={{ marginTop: '50px' }}>
        <Divider />
        <div>
          <Heading as="h1" size="lg" color="primary" style={{ marginBottom: '30px' }}>
            Got a Suggestion?
          </Heading>
          <p>Community Propsals are a great way to see how the community feels about your ideas.</p>
          <p>
            They wont neccessarily be implemented if the community votes successful, but suggestions with a lot of community support may be made into Core proposals.
          </p>
        </div>
      </div>
    </Page>
  )
}

export default ProposalOverview;
