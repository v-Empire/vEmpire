import React from 'react'
import { Button, Flex, Modal, Text } from '@pancakeswap-libs/uikit'
import { proposalsDetails } from 'utils/alphaGovernor'
import styled from 'styled-components'

const Row = styled.div`
  align-items: center;
  display: flex;
  font-size: 14px;
  justify-content: space-between;
  margin-bottom: 8px;
`
interface TitleDetailsModalProps{
    onDismiss?:()=>void;
    proposalId:number;
    title:string;
    description:string;
}

const TitleDetailsModal: React.FC<TitleDetailsModalProps>= ({onDismiss, proposalId, title, description}) => {
    const [proposalDetail, setProposalDetail] = React.useState<any>()

    React.useEffect(() => {

        const getProposal = async () => {
            const value = await proposalsDetails(proposalId)
            setProposalDetail(value)
        }
        getProposal()

    }, [proposalId])
    return (
        <Modal title="Title" onDismiss={()=>{onDismiss()}}>

            <Row>
                <Text fontSize="14px">Title:- </Text>
                <Text bold fontSize="14px">{title}</Text>
            </Row>
            <Row>
                <Text fontSize="14px">Description:- </Text>
                <Text bold fontSize="14px">{description}</Text>
            </Row>
            <Row>
                <Text fontSize="14px">Proposal Id:- </Text>
                {/* <CardValue fontSize="14px" value={getBalanceNumber(burnedBalance)} decimals={0} /> */}
                <Text bold fontSize="14px">{proposalId}</Text>
            </Row>
            <Row>
                <Text fontSize="14px">User Address:- </Text>
                {proposalDetail ? (<Text bold fontSize="14px">{proposalDetail?.proposer}</Text>) : ""}
            </Row>
            <Row>
                <Text fontSize="14px">End Voting:- </Text>
                {proposalDetail ? (<Text bold fontSize="14px">{proposalDetail?.endBlock}</Text>) : ""}
            </Row>
            <Row>
                <Text fontSize="14px">For Vote:- </Text>
                {proposalDetail ? (<Text bold fontSize="14px">{proposalDetail?.forVotes}</Text>) : ""}
            </Row>
            <Row>
                <Text fontSize="14px">Against Vote:- </Text>
                {proposalDetail ? (<Text bold fontSize="14px">{proposalDetail?.againstVotes}</Text>) : ""}
            </Row>
        </Modal>
    )
}

export default TitleDetailsModal
