import React, { useState } from 'react'
import { Heading, Checkbox, Text, Radio, Button, useModal, Flex } from '@pancakeswap-libs/uikit'
import styled from 'styled-components'
import { execute, getBlockNumber, queue, proposalsDetails } from 'utils/alphaGovernor'
import VoteNowModal from './VoteNowModal'
import TitleDetailsModal from './TitleDetailsModal'


const Title = styled(Text)`
    font-size: 24px;
    font-weight: 600;
    line-height: 1.1;
    color:#27262c !important;
    cursor:pointer
`

interface proposalProps {
    id: number,
    title: string,
    description: string
}

const ProposalData = ({ id, title, description }: proposalProps) => {

    const [voteNow] = useModal(<VoteNowModal proposalId={id} />)
    const [titleDetails] = useModal(<TitleDetailsModal title={title} description={description} proposalId={id} />)
    const [proposalEndBlock, setProposalEndBlock] = useState()
    const [proposalETA, setProposalETA] = useState()
    const [timeStamp, setTimeStamp] = useState<number>()
    const [showVote, setShowVote] = useState(false)
    const [showExecute, setShowExecute] = useState(false)


    React.useEffect(() => {

        const getProposal = async () => {
            const value = await proposalsDetails(id)
            const blockNumber = await getBlockNumber()
            if ((value?.endBlock) < blockNumber) {
                setShowVote(true)
            }
            else {
                setShowVote(false)
            }
            const currentEta = value?.eta
            let currentTimeStamp = Date.now()
            currentTimeStamp = (currentTimeStamp - (currentTimeStamp % 1000)) / 1000;
            setTimeStamp(Number(currentTimeStamp))
            if (Number(currentTimeStamp) > Number(currentEta) && Number(currentEta) !== 0) {
                setShowExecute(false)
            }
            else {
                setShowExecute(true)
            }
            setProposalEndBlock(value.endBlock)
            setProposalETA(value.eta)
        }
        getProposal()
        setInterval(getProposal, 10000)

    }, [id])

    return (
        <div style={{ marginBottom: '50px' }}>
            <Heading as="h1" size="lg" color="primary" style={{ marginBottom: '30px' }}>
                <Title onClick={titleDetails} >{title}</Title>
            </Heading>
            <p style={{ marginBottom: '30px' }}> <b>End Voting at block number</b>:- {proposalEndBlock}</p>
            <Flex>
                <Button style={{ marginRight: '10px' }} disabled={showVote} onClick={voteNow}>Vote Now</Button>
                <Button style={{ marginRight: '10px' }} disabled={!showVote && Number(proposalETA) < Number(timeStamp)} onClick={async () => {
                    await queue(id)
                }}>
                    Queue
                </Button>
                <Button disabled={showExecute} onClick={async () => {
                    await execute(id)
                }}>
                    Execute
                </Button>
            </Flex>

        </div >
    )
}

export default ProposalData
