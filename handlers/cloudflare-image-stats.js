const getRemainingCapacity = async(accountId, token)=> { 
   const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
   }
   const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/stats`, {headers});
   if (res.ok) {
     const data = await res.json()
    if (data.success == true) {
      return data.result.count.allowed - data.result.count.current
	}
    else {
	throw new Error(`API error! message: ${data.errors[0].message}`);
   }
   } else {
     throw new Error(`HTTP error! status: ${res.status}`);
   }
}


getRemainingCapacity(process.env.MATTERS_CLOUDFLARE_ACCOUNT_ID, process.env.MATTERS_CLOUDFLARE_API_TOKEN).then((remainingCapacity) => {console.log(remainingCapacity)}).catch((err) => {console.log(err)});
