import React from 'react'
import styled from 'styled-components'


const Text = styled('input')`
  font-size: 20px;
  text-align: center;
  border: 1px solid gray;
  border-radius: 5px;
  padding: 5px 0px;
  margin-bottom: 20px;
`

interface InputProps {
  value?: string
  placeholder?: string
  onChange?: (e: React.FormEvent<HTMLInputElement>) => void
  readonly?: any
}

const ProposalInput: React.FC<InputProps> = ({ onChange, value, placeholder, readonly }) => {
  return (
    <Text type="text" onChange={onChange} value={value} placeholder={placeholder} />
  )
}

export default ProposalInput
