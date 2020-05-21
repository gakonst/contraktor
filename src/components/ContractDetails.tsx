
import React, { useState, useEffect } from 'react';
import { Contract } from '../types';
import { BalanceCard } from './BalanceCard';
import { TransactionCard } from './TransactionCard';
import { ETHERSCAN_ADDRESS_LINK } from '../constants';
import { ethers } from 'ethers';
import { Loading } from '.';
import { parseAddress, getProvider } from '../utils/web3';
import { useWeb3React } from '@web3-react/core';
import { BaseProvider } from 'ethers/providers';
import { ContractMembersCard } from './ContractMembersCard';
import { ContractStateCard } from './ContractStateCard';

interface ContractProps { 
  currentAddress: string;
  contract: Contract;
}

export const ContractDetails = (props: ContractProps) => {
  const context = useWeb3React();
  const [loading, setLoading] = useState(true);
  const [contractState, setContractState] = useState(new Array<any>());
  const [functions, setFunctions] = useState({
    ctor: new Array<any>(),
    constants: new Array<any>(),
    functions: new Array<any>(),
    events: new Array<any>(),
    fallback: new Array<any>()
  });
  
  const parseContract = async () => { 
    const provider = context.library as BaseProvider || getProvider();
    console.log("try ethers.Contract")
    const contract = new ethers.Contract(props.currentAddress, props.contract.abi, provider);
    console.log(contract);

    const ctor = contract.interface.abi.filter((member: any) => member.type === "constructor");
    const constants = contract.interface.abi.filter((member: any) => member.constant === true || (member.stateMutability === "view" || member.stateMutability === "pure"));
    const functions = contract.interface.abi.filter((member: any) => (member.constant === false) || 
      (member.stateMutability !== "view" && member.stateMutability !== "pure" && member.type !== "constructor" && member.type !== "receive" && member.type !== "event"));
    const events = contract.interface.abi.filter((member: any) => member.type === "event");
    const fallback = contract.interface.abi.filter((member: any) => member.type === "receive");
    
    const executableConstants = constants.filter(i => i.inputs?.length === 0).map(async i => {
      const value = await contract.functions[i.name]();
      return {
        name: i.name,
        value: value
      };
    });
    const currentState = await Promise.all(executableConstants);
    
    setContractState(currentState);
    setFunctions({ ctor, constants, functions, events, fallback })
    setLoading(false);
  }

  useEffect(() => {
    parseContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, props.currentAddress, props.contract]);

  if (loading) { 
    return <Loading />
  } 

  return (
    <>
      <div>
        <h2>
          {props.contract?.name} 
          <small className="ml-2">
            <a href={`${ETHERSCAN_ADDRESS_LINK}${props.currentAddress}`} target="_blank" rel="noopener noreferrer" className="small text-muted" title={props.currentAddress}>
              {parseAddress(props.currentAddress)}
            </a>
          </small>
        </h2>

        <div className="card-deck">
          <BalanceCard address={props.currentAddress} />
          <TransactionCard address={props.currentAddress} />
        </div>

        <div className="mt-3 text-left">
          <ContractStateCard members={contractState} />
          <ContractMembersCard type="constructor" members={functions.ctor} />
          <ContractMembersCard type="views" members={functions.constants} />
          <ContractMembersCard type="functions" members={functions.functions} />
          <ContractMembersCard type="events" members={functions.events} />
          <ContractMembersCard type="fallback" members={functions.fallback} />
        </div>

      </div>
    </>
  );
}