```sql
SELECT *
FROM   restaurants;
```

```sql
SELECT *
FROM   restaurants
WHERE  city = 'Chicago';
```

```sql
SELECT *
FROM   restaurants
WHERE  category = 'Indian'
       AND price < 50;
```

```sql
SELECT *
FROM   restaurants
WHERE  name LIKE 'Best%';
```

```sql
SELECT *
FROM   restaurants
WHERE  name LIKE 'Best%'
        OR city = 'Los Angeles';
```

```sql
SELECT *
FROM   restaurants
WHERE  city IN ( 'Raleigh', 'Nashvile', 'Denver' );
```

```sql
SELECT *
FROM   restaurants
WHERE  city != 'Oklahoma';
```

```sql
SELECT *
FROM   restaurants
WHERE  favorite;
```

```sql
SELECT *
FROM   restaurants
WHERE  favorite = true;
```

```sql
SELECT *
FROM   restaurants
WHERE  favorite IS NULL;
```

```sql
SELECT *
FROM   restaurants
WHERE  city = 'Memphis'
       AND ( price < 40
              OR avgrating > 8 )
ORDER  BY price DESC,
          avgrating;
```

```sql
SELECT *
FROM   restaurants
WHERE  price BETWEEN 25 AND 150
ORDER  BY city,
          price
LIMIT  10;
```

```sql
SELECT *
FROM   restaurants
WHERE  city = 'Chicago'
UNION
SELECT *
FROM   restaurants
WHERE  price > 200;
```