import random from 'lodash/random'

// Array of available nodes to connect to
const nodes = [process.env.REACT_APP_NODE_1, process.env.REACT_APP_NODE_2, process.env.REACT_APP_NODE_3]

const getNodeUrl = () => {
  const randomIndex = 'https://kovan.infura.io/v3/5ab18e98783640a4a8a36f54870652c0'
  return randomIndex
}

export default getNodeUrl
