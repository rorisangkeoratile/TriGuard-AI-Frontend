import { formatNumber } from './normalize.js'

// Where a number is registered, from its prefix in the public numbering plan, never from GPS.
// POPIA / RICA: TriGuard never tracks a caller's or user's live location. Mobile and VoIP numbers are not tied to a place,
// and under RICA only law enforcement can get a phone's network location (with a judge's or magistrate's direction).
const SA_GEO = {'10':['Johannesburg','Gauteng'],'11':['Johannesburg','Gauteng'],'12':['Pretoria','Gauteng'],'13':['Mbombela','Mpumalanga'],'14':['Rustenburg','North West'],'15':['Polokwane','Limpopo'],'16':['Vereeniging','Gauteng'],'17':['Ermelo','Mpumalanga'],'18':['Klerksdorp','North West'],
 '21':['Cape Town','Western Cape'],'22':['West Coast','Western Cape'],'23':['Worcester','Western Cape'],'27':['Namaqualand','Northern Cape'],'28':['Overberg','Western Cape'],
 '31':['Durban','KwaZulu-Natal'],'32':['North Coast','KwaZulu-Natal'],'33':['Pietermaritzburg','KwaZulu-Natal'],'34':['Newcastle','KwaZulu-Natal'],'35':['Richards Bay','KwaZulu-Natal'],'36':['Ladysmith','KwaZulu-Natal'],'39':['South Coast','KwaZulu-Natal'],
 '40':['Bhisho','Eastern Cape'],'41':['Gqeberha','Eastern Cape'],'42':['Kouga','Eastern Cape'],'43':['East London','Eastern Cape'],'44':['George','Western Cape'],'45':['Komani','Eastern Cape'],'46':['Makhanda','Eastern Cape'],'47':['Mthatha','Eastern Cape'],'48':['Cradock','Eastern Cape'],'49':['Graaff-Reinet','Eastern Cape'],
 '51':['Bloemfontein','Free State'],'53':['Kimberley','Northern Cape'],'54':['Upington','Northern Cape'],'56':['Kroonstad','Free State'],'57':['Welkom','Free State'],'58':['Bethlehem','Free State']}
const SA_MOBILE = {'72':'Vodacom','76':'Vodacom','79':'Vodacom','82':'Vodacom','73':'MTN','78':'MTN','83':'MTN','63':'MTN','74':'Cell C','84':'Cell C','61':'Cell C','81':'Telkom Mobile'}
const COUNTRIES = [['+44 20','London, United Kingdom'],['+44','United Kingdom'],['+1','USA / Canada'],['+234','Nigeria'],['+263','Zimbabwe'],['+267','Botswana'],['+266','Lesotho'],['+268','Eswatini'],['+258','Mozambique'],['+264','Namibia'],['+254','Kenya'],['+91','India'],['+86','China'],['+971','United Arab Emirates'],['+61','Australia'],['+49','Germany'],['+33','France']]

export function origin(num) {
  if (!num) return null
  if (num.startsWith('+27')) {
    const p2 = num.slice(3, 5)
    if (SA_GEO[p2]) return {kind:'Landline',city:SA_GEO[p2][0],province:SA_GEO[p2][1],country:'South Africa',place:SA_GEO[p2][0],area:SA_GEO[p2][1]+', South Africa',exact:true,hidden:false,method:'Area-code region',note:`Area code 0${p2} is assigned to ${SA_GEO[p2][0]}, ${SA_GEO[p2][1]}. This is the area of the number, not the caller’s exact location.`}
    const base = {city:'',province:'',country:'South Africa',place:'Not shown',area:'',exact:false,hidden:true,method:'Not shown: privacy law'}
    const why = 'Mobile and internet numbers aren’t tied to a place, and TriGuard doesn’t track people. Under RICA, only the police can get a phone’s location from the network, with a court direction.'
    if (p2 === '87') return {...base,kind:'Internet (VoIP) number',note:'Internet (VoIP) numbers can be used from anywhere. '+why}
    if (p2 === '86') return {...base,kind:'Shared-cost number',note:why}
    if (p2 === '80') return {...base,kind:'Toll-free number',note:why}
    if (/^[678]/.test(p2)) { const net = SA_MOBILE[p2]; return {...base,kind:net?`Mobile · ${net}`:'Mobile',note:why} }
    return {...base,kind:'Number',note:why}
  }
  const pretty = formatNumber(num)
  for (const [pre, name] of COUNTRIES) {
    if (pretty.startsWith(pre + ' ') || num.startsWith(pre.replace(/\s/g, ''))) {
      const city = name.includes(',') ? name.split(',')[0] : ''
      const country = name.includes(',') ? name.split(',')[1].trim() : name
      return {kind:'International',city,province:'',country,place:city||country,area:city?country:'',exact:!!city,hidden:false,method:city?'Area-code region':'Country code',note:`Country code ${pre.split(' ')[0]}. This is where the number is registered, not the caller’s exact location.`}
    }
  }
  return {kind:'International',city:'',province:'',country:'Outside South Africa',place:'Outside South Africa',area:'',exact:false,hidden:false,method:'Country code',note:''}
}
