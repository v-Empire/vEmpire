import React, { useState } from 'react'
import styled from 'styled-components'
import AddParam from './AddParam'
import ProposalInput from '../ProposalInput'

const Container = styled('div')`
  display: flex;
  flex-direction: column;
  justify-content: center;
`
const Label = styled('label')`
  font-size: 20px;
  color:#ffffff;
  margin-bottom: 30px;
`

const TextArea = styled('input')`
  font-size: 20px;
  text-align: center;
  border: 1px solid gray;
  border-radius: 5px;
  padding: 35px 0px;
  margin-bottom: 30px;
`

interface proposalProps {
  handleTitle?: (e) => void
  handleAddress?: (e) => void
  handleTextArea?: (e) => void
  handleParamChange?: (e) => void
  value: any
}

const ProposalLeft: React.FC<proposalProps> = ({ value, handleTitle, handleAddress, handleTextArea, handleParamChange }) => {
  return (
    <Container>
      <Label>Proposal Title :</Label>
      <ProposalInput value={value.title} onChange={(e) => handleTitle(e.currentTarget.value)} placeholder="Title" />
      <Label>Contract Address :</Label>
      <ProposalInput value={value.address} onChange={(e) => handleAddress(e.currentTarget.value)} />
      <Label>Content :</Label>
      <TextArea value={value.description} onChange={(e) => handleTextArea(e.currentTarget.value)} />
      <Label>Add Params :-</Label>
      <AddParam handleParamChange={handleParamChange} />

      {/* {
        value?.paramValue.map((param) =>
        (
          <AddParam paramValue={param.value} handleParamChange={handleParamChange} />
        )
        )
      } */}

    </Container>
  )
}

export default ProposalLeft
