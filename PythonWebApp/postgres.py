import psycopg2

def connect_db():
    try:
        connection = psycopg2.connect(
            host='db',
            user='admin',
            password='admin',
            database='web_app'
        )
        print('Conectado a la base de datos (PostgreSQL)')
        return connection
    except Exception as e:
        print(f'Error de conexión: {e}')
        return None

def close_connection(connection):
    connection.close()
    print('Conexión cerrada')

def _build_sql(query, params):
    if params is None:
        return query
    if not isinstance(params, (list, tuple)):
        params = [params]
    for param in params:
        if param is None:
            value = 'NULL'
        elif isinstance(param, (int, float)):
            value = str(param)
        else:
            value = "'" + str(param).replace("'", "''") + "'"
        if '%s' in query:
            query = query.replace('%s', value, 1)
        elif '?' in query:
            query = query.replace('?', value, 1)
    return query

def query_db(query, params=None):
    connection = connect_db()
    if connection:
        cursor = connection.cursor()
        try:
            sql = _build_sql(query, params)
            cursor.execute(sql)
            if query.strip().lower().startswith("select"):
                columns = [desc[0] for desc in cursor.description]
                result = [dict(zip(columns, row)) for row in cursor.fetchall()]
            else:
                result = cursor.rowcount
            connection.commit()
            return result
        except Exception as e:
            print(f'Error en la consulta: {e}')
            return None if query.strip().lower().startswith("select") else 0
        finally:
            cursor.close()
            close_connection(connection)