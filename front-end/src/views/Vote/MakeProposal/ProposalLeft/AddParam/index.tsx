import React, { useState, useEffect } from 'react'
import { Button, Flex } from '@pancakeswap-libs/uikit'
import styled from 'styled-components'

const Container = styled('div')`
  display: flex;
  flex-direction: column;
  justify-content: center;
  div button{
    background-color: #27262c !important;
  }
`
const Label = styled('label')`
  font-size: 20px;
  margin-bottom: 30px;
`
const ParamButton= styled(Button)`
background-color: #27262c !important;
`
const Text = styled('input')`
  font-size: 20px;
  text-align: center;
  border: 1px solid gray;
  border-radius: 5px;
  padding: 5px 0px;
  margin-bottom: 30px;
`
const Card = styled('div')`
  width: 100%;
  height: 200px;
  border: 1px solid gray;
  border-radius: 10px;
  margin-bottom: 30px;
`
const ParamContainer = styled('div')`
  display: flex;
  flex-direction: column;
`


const ProposalLeftComponent = ({ handleParamChange }) => {
  const [keyValue,] = useState(0)

  const [fields, setFields] = useState([{ value: null }])

  useEffect(() => {
    handleParamChange(fields)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields])


  function handleChange(i, event) {
    const values = [...fields]
    values[i].value = event.target.value
    setFields(values)
  }

  function handleAdd() {
    const values = [...fields]
    values.push({ value: null })
    setFields(values)

  }

  function handleRemove(i) {
    const values = [...fields]
    values.splice(i, 1)
    setFields(values)
  }

  return (
    <>
      {fields.map((field, idx) => {
        return (
          <ParamContainer key={`${keyValue}`} >
            <Text key={`${keyValue}`} type="text" placeholder="Params" onChange={(e) => handleChange(idx, e)} />
          </ParamContainer>
        )
      })}
      <Flex>

        <ParamButton style={{ alignSelf: 'center' }} onClick={() => handleAdd()}>
          Add Param
        </ParamButton>
        <ParamButton style={{ alignSelf: 'center', marginLeft: '10px' }} onClick={(e) => handleRemove(e)}>
          Remove Param
        </ParamButton>
      </Flex>

    </>
  )
}

export default ProposalLeftComponent
