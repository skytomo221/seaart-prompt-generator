import React, {createContext,useContext,useReducer} from "react";
import {Attribute,Category,Concept,Data,PromptGeneratorsData} from "../data";
export const emptyData:Data={schemaVersion:2,attributes:[],categories:[],concepts:[]};
export const emptyGenerators:PromptGeneratorsData={schemaVersion:2,promptGenerators:[]};
const DataContext=createContext<[Data,React.Dispatch<any>]>([emptyData,()=>{}]);
const PgContext=createContext<[PromptGeneratorsData,React.Dispatch<any>]>([emptyGenerators,()=>{}]);
export const attributesContext=createContext<Attribute[]>([]);
export const categoriesContext=createContext<Category[]>([]);
export const conceptsContext=createContext<Concept[]>([]);
export const promptGeneratorsContext=createContext<PromptGeneratorsData>(emptyGenerators);
function dataReducer(s:Data,a:any):Data{return a.type==="set"?a.value:s;}
function pgReducer(s:PromptGeneratorsData,a:any):PromptGeneratorsData{return a.type==="set"?a.value:s;}
export function V2Provider({children}:{children:React.ReactNode}){const [d,dd]=useReducer(dataReducer,emptyData);const [p,dp]=useReducer(pgReducer,emptyGenerators);return <DataContext.Provider value={[d,dd]}><PgContext.Provider value={[p,dp]}><attributesContext.Provider value={d.attributes}><categoriesContext.Provider value={d.categories}><conceptsContext.Provider value={d.concepts}><promptGeneratorsContext.Provider value={p}>{children}</promptGeneratorsContext.Provider></conceptsContext.Provider></categoriesContext.Provider></attributesContext.Provider></PgContext.Provider></DataContext.Provider>}
export const useData=()=>useContext(DataContext);export const useGenerators=()=>useContext(PgContext);
