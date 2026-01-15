SELECT 
	 customers.zone,
	 customers.city,
	 customers.branch_name,
	 transactions.channel,
	 MEASURE(transactions.debit_to_credit_ratio)
 FROM
	 customers
	 CROSS JOIN transactions
 GROUP BY 1,2,3,4
 LIMIT 
	 10
 OFFSET 
	 0

