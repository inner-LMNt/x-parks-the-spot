--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4 (Debian 16.4-1.pgdg110+2)
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: coalesce_timetable_by_parking_space_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.coalesce_timetable_by_parking_space_id(selected_parking_space_id uuid) RETURNS SETOF tstzrange
    LANGUAGE plpgsql
    AS $$
DECLARE
    curr paid_parking_allowed_availability;
    prev paid_parking_allowed_availability;
BEGIN
    for curr in
        SELECT *
        FROM paid_parking_allowed_availability
		WHERE paid_parking_allowed_availability.parking_space_id = selected_parking_space_id
        ORDER BY time
    loop
        if prev.time && curr.time then
            prev.time:= prev.time + curr.time;
        else
            if prev notnull then
                return next prev.time;
            end if;
            prev:= curr;
        end if;
    end loop;
    return next prev.time;
end $$;


--
-- Name: update_parking_space_ratings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_parking_space_ratings() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE parking_spaces
        SET
            avg_availability_rating = ROUND((
                SELECT AVG(availability_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND availability_rating IS NOT NULL
            ), 2),
            avg_cleanliness_rating = ROUND((
                SELECT AVG(cleanliness_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND cleanliness_rating IS NOT NULL
            ), 2),
            avg_total_rating = ROUND((
                SELECT AVG(total_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
            ), 2),
            ratings_count_availability = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND availability_rating IS NOT NULL
            ),
            ratings_count_cleanliness = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND cleanliness_rating IS NOT NULL
            )
        WHERE id = NEW.parking_space_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE parking_spaces
        SET
            avg_availability_rating = ROUND((
                SELECT AVG(availability_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND availability_rating IS NOT NULL
            ), 2),
            avg_cleanliness_rating = ROUND((
                SELECT AVG(cleanliness_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND cleanliness_rating IS NOT NULL
            ), 2),
            avg_total_rating = ROUND((
                SELECT AVG(total_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
            ), 2),
            ratings_count_availability = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND availability_rating IS NOT NULL
            ),
            ratings_count_cleanliness = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND cleanliness_rating IS NOT NULL
            )
        WHERE id = OLD.parking_space_id;
    END IF;
    RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    make character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    license_plate character varying(20) NOT NULL,
    color character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    license_plate_state character varying(2)
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    migration_name text NOT NULL
);


--
-- Name: paid_parking_allowed_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paid_parking_allowed_availability (
    id integer NOT NULL,
    parking_space_id uuid NOT NULL,
    "time" tstzrange
);


--
-- Name: paid_parking_allowed_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paid_parking_allowed_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paid_parking_allowed_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paid_parking_allowed_availability_id_seq OWNED BY public.paid_parking_allowed_availability.id;


--
-- Name: parking_spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parking_spaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner uuid NOT NULL,
    location public.geography(Point,4326),
    is_paid boolean DEFAULT false,
    name text,
    availability_schedule jsonb,
    photos text[],
    verification_status text,
    cancellation_policy text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    address text,
    price double precision,
    photo_timestamp timestamp with time zone,
    verification_photos text[],
    avg_availability_rating numeric(3,2) DEFAULT NULL::numeric,
    avg_cleanliness_rating numeric(3,2) DEFAULT NULL::numeric,
    avg_total_rating numeric(3,2) DEFAULT NULL::numeric,
    ratings_count_availability integer DEFAULT 0,
    ratings_count_cleanliness integer DEFAULT 0,
    is_taken boolean DEFAULT false
);


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parking_space_id uuid NOT NULL,
    user_id uuid NOT NULL,
    availability_rating integer,
    cleanliness_rating integer,
    total_rating numeric(3,2) GENERATED ALWAYS AS (
CASE
    WHEN ((availability_rating IS NOT NULL) AND (cleanliness_rating IS NOT NULL)) THEN (((availability_rating + cleanliness_rating))::numeric / 2.0)
    WHEN (availability_rating IS NOT NULL) THEN (availability_rating)::numeric
    WHEN (cleanliness_rating IS NOT NULL) THEN (cleanliness_rating)::numeric
    ELSE NULL::numeric
END) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ratings_availability_rating_check CHECK (((availability_rating >= 1) AND (availability_rating <= 5))),
    CONSTRAINT ratings_cleanliness_rating_check CHECK (((cleanliness_rating >= 1) AND (cleanliness_rating <= 5)))
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reservation_id uuid NOT NULL,
    description text NOT NULL,
    type character varying(100) DEFAULT 'Other'::character varying NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying NOT NULL,
    admin_response text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying])::text[]))),
    CONSTRAINT reports_type_check CHECK (((type)::text = ANY ((ARRAY['Other'::character varying, 'Technical'::character varying, 'Billing'::character varying])::text[])))
);


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parking_space_id uuid NOT NULL,
    renter_id uuid NOT NULL,
    car_info_id uuid NOT NULL,
    status character varying(20) DEFAULT 'booked'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "time" tstzrange
);


--
-- Name: timetable_coalesce; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_coalesce (
    id integer NOT NULL,
    parking_space_id uuid NOT NULL,
    "time" tstzrange NOT NULL
);


--
-- Name: timetable_coalesce_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_coalesce_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_coalesce_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_coalesce_id_seq OWNED BY public.timetable_coalesce.id;


--
-- Name: user_delete_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_delete_requests (
    id integer NOT NULL,
    user_id uuid,
    token text NOT NULL,
    expiry timestamp without time zone NOT NULL
);


--
-- Name: user_delete_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_delete_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_delete_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_delete_requests_id_seq OWNED BY public.user_delete_requests.id;


--
-- Name: user_pw_reset_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_pw_reset_requests (
    id integer NOT NULL,
    user_id uuid,
    token text NOT NULL,
    expiry timestamp without time zone NOT NULL
);


--
-- Name: user_pw_reset_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_pw_reset_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_pw_reset_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_pw_reset_requests_id_seq OWNED BY public.user_pw_reset_requests.id;


--
-- Name: user_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tokens (
    id integer NOT NULL,
    user_id uuid,
    token text NOT NULL,
    expiry timestamp without time zone NOT NULL
);


--
-- Name: user_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_tokens_id_seq OWNED BY public.user_tokens.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    deleted_at timestamp without time zone
);


--
-- Name: paid_parking_allowed_availability id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability ALTER COLUMN id SET DEFAULT nextval('public.paid_parking_allowed_availability_id_seq'::regclass);


--
-- Name: timetable_coalesce id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_coalesce ALTER COLUMN id SET DEFAULT nextval('public.timetable_coalesce_id_seq'::regclass);


--
-- Name: user_delete_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_delete_requests ALTER COLUMN id SET DEFAULT nextval('public.user_delete_requests_id_seq'::regclass);


--
-- Name: user_pw_reset_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pw_reset_requests ALTER COLUMN id SET DEFAULT nextval('public.user_pw_reset_requests_id_seq'::regclass);


--
-- Name: user_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_tokens_id_seq'::regclass);


--
-- Data for Name: cars; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cars (id, user_id, make, model, license_plate, color, created_at, updated_at, license_plate_state) FROM stdin;
41288575-3c97-4eb9-8e80-94a7e1b970c0	f58d5dfa-bff2-4f68-9191-544404440ae6	Toyota	Corolla	123ABC	Blue	2024-11-01 03:39:39.311148+00	2024-11-01 04:20:04.400471+00	\N
a232dfa7-9d3f-48b2-bd27-79ea0bcb7cb1	71683361-f3d5-4474-a886-c34472b34d39	Audi	A4	ISPEED	\N	2024-11-01 06:12:29.009516+00	2024-11-01 06:12:29.009516+00	\N
ecfa1350-1431-4b40-b13d-64899f76b137	4a7cd564-325e-4834-b78c-78b5cb7f520f	Honda	Piolot	987FGH	Blue	2024-11-01 06:14:41.109296+00	2024-11-01 08:03:25.56633+00	PA
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (migration_name) FROM stdin;
00-usertable.sql
01-tokenstore.sql
02-postgis.sql
03-parkingspace.sql
04-addDeletionColumn.sql
05-deletetoken.sql
06-parkingspace.sql
06-resettoken.sql
07-cars.sql
08-reservations.sql
09-availability.sql
10-spacecoalesce.sql
11-reports.sql
12-parkingspace.sql
13-parkingspace.sql
14-ratings.sql
11-parkingspace.sql
13-cars-license-state.sql
\.


--
-- Data for Name: paid_parking_allowed_availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.paid_parking_allowed_availability (id, parking_space_id, "time") FROM stdin;
1	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-10-28 03:59:00+00","2024-10-29 04:00:00+00"]
2	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-04 04:59:00+00","2024-11-05 05:00:00+00"]
3	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-11 04:59:00+00","2024-11-12 05:00:00+00"]
4	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-18 04:59:00+00","2024-11-19 05:00:00+00"]
5	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-25 04:59:00+00","2024-11-26 05:00:00+00"]
6	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-02 04:59:00+00","2024-12-03 05:00:00+00"]
7	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-09 04:59:00+00","2024-12-10 05:00:00+00"]
8	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-16 04:59:00+00","2024-12-17 05:00:00+00"]
9	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-23 04:59:00+00","2024-12-24 05:00:00+00"]
10	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-30 04:59:00+00","2024-12-31 05:00:00+00"]
11	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-06 04:59:00+00","2025-01-07 05:00:00+00"]
12	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-13 04:59:00+00","2025-01-14 05:00:00+00"]
13	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-20 04:59:00+00","2025-01-21 05:00:00+00"]
14	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-27 04:59:00+00","2025-01-28 05:00:00+00"]
15	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-03 04:59:00+00","2025-02-04 05:00:00+00"]
16	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-10 04:59:00+00","2025-02-11 05:00:00+00"]
17	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-17 04:59:00+00","2025-02-18 05:00:00+00"]
18	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-24 04:59:00+00","2025-02-25 05:00:00+00"]
19	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-03 04:59:00+00","2025-03-04 05:00:00+00"]
20	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-10 03:59:00+00","2025-03-11 04:00:00+00"]
21	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-17 03:59:00+00","2025-03-18 04:00:00+00"]
22	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-24 03:59:00+00","2025-03-25 04:00:00+00"]
23	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-31 03:59:00+00","2025-04-01 04:00:00+00"]
24	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-07 03:59:00+00","2025-04-08 04:00:00+00"]
25	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-14 03:59:00+00","2025-04-15 04:00:00+00"]
26	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-21 03:59:00+00","2025-04-22 04:00:00+00"]
27	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-28 03:59:00+00","2025-04-29 04:00:00+00"]
28	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-05 03:59:00+00","2025-05-06 04:00:00+00"]
29	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-12 03:59:00+00","2025-05-13 04:00:00+00"]
30	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-19 03:59:00+00","2025-05-20 04:00:00+00"]
31	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-26 03:59:00+00","2025-05-27 04:00:00+00"]
32	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-02 03:59:00+00","2025-06-03 04:00:00+00"]
33	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-09 03:59:00+00","2025-06-10 04:00:00+00"]
34	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-16 03:59:00+00","2025-06-17 04:00:00+00"]
35	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-23 03:59:00+00","2025-06-24 04:00:00+00"]
36	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-30 03:59:00+00","2025-07-01 04:00:00+00"]
37	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-07 03:59:00+00","2025-07-08 04:00:00+00"]
38	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-14 03:59:00+00","2025-07-15 04:00:00+00"]
39	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-21 03:59:00+00","2025-07-22 04:00:00+00"]
40	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-28 03:59:00+00","2025-07-29 04:00:00+00"]
41	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-04 03:59:00+00","2025-08-05 04:00:00+00"]
42	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-11 03:59:00+00","2025-08-12 04:00:00+00"]
43	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-18 03:59:00+00","2025-08-19 04:00:00+00"]
44	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-25 03:59:00+00","2025-08-26 04:00:00+00"]
45	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-01 03:59:00+00","2025-09-02 04:00:00+00"]
46	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-08 03:59:00+00","2025-09-09 04:00:00+00"]
47	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-15 03:59:00+00","2025-09-16 04:00:00+00"]
48	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-22 03:59:00+00","2025-09-23 04:00:00+00"]
49	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-29 03:59:00+00","2025-09-30 04:00:00+00"]
50	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-06 03:59:00+00","2025-10-07 04:00:00+00"]
51	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-13 03:59:00+00","2025-10-14 04:00:00+00"]
52	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-20 03:59:00+00","2025-10-21 04:00:00+00"]
53	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-10-29 03:59:00+00","2024-10-30 04:00:00+00"]
54	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-05 04:59:00+00","2024-11-06 05:00:00+00"]
55	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-12 04:59:00+00","2024-11-13 05:00:00+00"]
56	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-19 04:59:00+00","2024-11-20 05:00:00+00"]
57	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-26 04:59:00+00","2024-11-27 05:00:00+00"]
58	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-03 04:59:00+00","2024-12-04 05:00:00+00"]
59	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-10 04:59:00+00","2024-12-11 05:00:00+00"]
60	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-17 04:59:00+00","2024-12-18 05:00:00+00"]
61	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-24 04:59:00+00","2024-12-25 05:00:00+00"]
62	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-31 04:59:00+00","2025-01-01 05:00:00+00"]
63	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-07 04:59:00+00","2025-01-08 05:00:00+00"]
64	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-14 04:59:00+00","2025-01-15 05:00:00+00"]
65	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-21 04:59:00+00","2025-01-22 05:00:00+00"]
66	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-28 04:59:00+00","2025-01-29 05:00:00+00"]
67	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-04 04:59:00+00","2025-02-05 05:00:00+00"]
68	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-11 04:59:00+00","2025-02-12 05:00:00+00"]
69	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-18 04:59:00+00","2025-02-19 05:00:00+00"]
70	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-25 04:59:00+00","2025-02-26 05:00:00+00"]
71	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-04 04:59:00+00","2025-03-05 05:00:00+00"]
72	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-11 03:59:00+00","2025-03-12 04:00:00+00"]
73	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-18 03:59:00+00","2025-03-19 04:00:00+00"]
74	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-25 03:59:00+00","2025-03-26 04:00:00+00"]
75	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-01 03:59:00+00","2025-04-02 04:00:00+00"]
76	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-08 03:59:00+00","2025-04-09 04:00:00+00"]
77	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-15 03:59:00+00","2025-04-16 04:00:00+00"]
78	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-22 03:59:00+00","2025-04-23 04:00:00+00"]
79	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-29 03:59:00+00","2025-04-30 04:00:00+00"]
80	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-06 03:59:00+00","2025-05-07 04:00:00+00"]
81	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-13 03:59:00+00","2025-05-14 04:00:00+00"]
82	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-20 03:59:00+00","2025-05-21 04:00:00+00"]
83	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-27 03:59:00+00","2025-05-28 04:00:00+00"]
84	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-03 03:59:00+00","2025-06-04 04:00:00+00"]
85	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-10 03:59:00+00","2025-06-11 04:00:00+00"]
86	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-17 03:59:00+00","2025-06-18 04:00:00+00"]
87	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-24 03:59:00+00","2025-06-25 04:00:00+00"]
88	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-01 03:59:00+00","2025-07-02 04:00:00+00"]
89	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-08 03:59:00+00","2025-07-09 04:00:00+00"]
90	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-15 03:59:00+00","2025-07-16 04:00:00+00"]
91	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-22 03:59:00+00","2025-07-23 04:00:00+00"]
92	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-29 03:59:00+00","2025-07-30 04:00:00+00"]
93	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-05 03:59:00+00","2025-08-06 04:00:00+00"]
94	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-12 03:59:00+00","2025-08-13 04:00:00+00"]
95	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-19 03:59:00+00","2025-08-20 04:00:00+00"]
96	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-26 03:59:00+00","2025-08-27 04:00:00+00"]
97	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-02 03:59:00+00","2025-09-03 04:00:00+00"]
98	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-09 03:59:00+00","2025-09-10 04:00:00+00"]
99	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-16 03:59:00+00","2025-09-17 04:00:00+00"]
100	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-23 03:59:00+00","2025-09-24 04:00:00+00"]
101	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-30 03:59:00+00","2025-10-01 04:00:00+00"]
102	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-07 03:59:00+00","2025-10-08 04:00:00+00"]
103	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-14 03:59:00+00","2025-10-15 04:00:00+00"]
104	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-21 03:59:00+00","2025-10-22 04:00:00+00"]
105	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-10-30 03:59:00+00","2024-10-31 04:00:00+00"]
106	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-06 04:59:00+00","2024-11-07 05:00:00+00"]
107	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-13 04:59:00+00","2024-11-14 05:00:00+00"]
108	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-20 04:59:00+00","2024-11-21 05:00:00+00"]
109	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-27 04:59:00+00","2024-11-28 05:00:00+00"]
110	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-04 04:59:00+00","2024-12-05 05:00:00+00"]
111	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-11 04:59:00+00","2024-12-12 05:00:00+00"]
112	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-18 04:59:00+00","2024-12-19 05:00:00+00"]
113	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-25 04:59:00+00","2024-12-26 05:00:00+00"]
114	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-01 04:59:00+00","2025-01-02 05:00:00+00"]
115	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-08 04:59:00+00","2025-01-09 05:00:00+00"]
116	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-15 04:59:00+00","2025-01-16 05:00:00+00"]
117	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-22 04:59:00+00","2025-01-23 05:00:00+00"]
118	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-29 04:59:00+00","2025-01-30 05:00:00+00"]
119	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-05 04:59:00+00","2025-02-06 05:00:00+00"]
120	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-12 04:59:00+00","2025-02-13 05:00:00+00"]
121	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-19 04:59:00+00","2025-02-20 05:00:00+00"]
122	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-26 04:59:00+00","2025-02-27 05:00:00+00"]
123	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-05 04:59:00+00","2025-03-06 05:00:00+00"]
124	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-12 03:59:00+00","2025-03-13 04:00:00+00"]
125	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-19 03:59:00+00","2025-03-20 04:00:00+00"]
126	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-26 03:59:00+00","2025-03-27 04:00:00+00"]
127	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-02 03:59:00+00","2025-04-03 04:00:00+00"]
128	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-09 03:59:00+00","2025-04-10 04:00:00+00"]
129	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-16 03:59:00+00","2025-04-17 04:00:00+00"]
130	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-23 03:59:00+00","2025-04-24 04:00:00+00"]
131	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-30 03:59:00+00","2025-05-01 04:00:00+00"]
132	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-07 03:59:00+00","2025-05-08 04:00:00+00"]
133	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-14 03:59:00+00","2025-05-15 04:00:00+00"]
134	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-21 03:59:00+00","2025-05-22 04:00:00+00"]
135	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-28 03:59:00+00","2025-05-29 04:00:00+00"]
136	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-04 03:59:00+00","2025-06-05 04:00:00+00"]
137	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-11 03:59:00+00","2025-06-12 04:00:00+00"]
138	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-18 03:59:00+00","2025-06-19 04:00:00+00"]
139	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-25 03:59:00+00","2025-06-26 04:00:00+00"]
140	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-02 03:59:00+00","2025-07-03 04:00:00+00"]
141	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-09 03:59:00+00","2025-07-10 04:00:00+00"]
142	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-16 03:59:00+00","2025-07-17 04:00:00+00"]
143	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-23 03:59:00+00","2025-07-24 04:00:00+00"]
144	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-30 03:59:00+00","2025-07-31 04:00:00+00"]
145	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-06 03:59:00+00","2025-08-07 04:00:00+00"]
146	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-13 03:59:00+00","2025-08-14 04:00:00+00"]
147	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-20 03:59:00+00","2025-08-21 04:00:00+00"]
148	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-27 03:59:00+00","2025-08-28 04:00:00+00"]
149	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-03 03:59:00+00","2025-09-04 04:00:00+00"]
150	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-10 03:59:00+00","2025-09-11 04:00:00+00"]
151	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-17 03:59:00+00","2025-09-18 04:00:00+00"]
152	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-24 03:59:00+00","2025-09-25 04:00:00+00"]
153	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-01 03:59:00+00","2025-10-02 04:00:00+00"]
154	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-08 03:59:00+00","2025-10-09 04:00:00+00"]
155	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-15 03:59:00+00","2025-10-16 04:00:00+00"]
156	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-22 03:59:00+00","2025-10-23 04:00:00+00"]
157	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-10-31 03:59:00+00","2024-11-01 04:00:00+00"]
158	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-07 04:59:00+00","2024-11-08 05:00:00+00"]
159	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-14 04:59:00+00","2024-11-15 05:00:00+00"]
160	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-21 04:59:00+00","2024-11-22 05:00:00+00"]
161	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-28 04:59:00+00","2024-11-29 05:00:00+00"]
162	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-05 04:59:00+00","2024-12-06 05:00:00+00"]
163	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-12 04:59:00+00","2024-12-13 05:00:00+00"]
164	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-19 04:59:00+00","2024-12-20 05:00:00+00"]
165	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-26 04:59:00+00","2024-12-27 05:00:00+00"]
166	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-02 04:59:00+00","2025-01-03 05:00:00+00"]
167	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-09 04:59:00+00","2025-01-10 05:00:00+00"]
168	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-16 04:59:00+00","2025-01-17 05:00:00+00"]
169	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-23 04:59:00+00","2025-01-24 05:00:00+00"]
170	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-30 04:59:00+00","2025-01-31 05:00:00+00"]
171	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-06 04:59:00+00","2025-02-07 05:00:00+00"]
172	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-13 04:59:00+00","2025-02-14 05:00:00+00"]
173	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-20 04:59:00+00","2025-02-21 05:00:00+00"]
174	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-27 04:59:00+00","2025-02-28 05:00:00+00"]
175	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-06 04:59:00+00","2025-03-07 05:00:00+00"]
176	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-13 03:59:00+00","2025-03-14 04:00:00+00"]
177	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-20 03:59:00+00","2025-03-21 04:00:00+00"]
178	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-27 03:59:00+00","2025-03-28 04:00:00+00"]
179	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-03 03:59:00+00","2025-04-04 04:00:00+00"]
180	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-10 03:59:00+00","2025-04-11 04:00:00+00"]
181	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-17 03:59:00+00","2025-04-18 04:00:00+00"]
182	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-24 03:59:00+00","2025-04-25 04:00:00+00"]
183	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-01 03:59:00+00","2025-05-02 04:00:00+00"]
184	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-08 03:59:00+00","2025-05-09 04:00:00+00"]
185	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-15 03:59:00+00","2025-05-16 04:00:00+00"]
186	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-22 03:59:00+00","2025-05-23 04:00:00+00"]
187	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-29 03:59:00+00","2025-05-30 04:00:00+00"]
188	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-05 03:59:00+00","2025-06-06 04:00:00+00"]
189	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-12 03:59:00+00","2025-06-13 04:00:00+00"]
190	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-19 03:59:00+00","2025-06-20 04:00:00+00"]
191	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-26 03:59:00+00","2025-06-27 04:00:00+00"]
192	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-03 03:59:00+00","2025-07-04 04:00:00+00"]
193	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-10 03:59:00+00","2025-07-11 04:00:00+00"]
194	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-17 03:59:00+00","2025-07-18 04:00:00+00"]
195	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-24 03:59:00+00","2025-07-25 04:00:00+00"]
196	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-31 03:59:00+00","2025-08-01 04:00:00+00"]
197	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-07 03:59:00+00","2025-08-08 04:00:00+00"]
198	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-14 03:59:00+00","2025-08-15 04:00:00+00"]
199	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-21 03:59:00+00","2025-08-22 04:00:00+00"]
200	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-28 03:59:00+00","2025-08-29 04:00:00+00"]
201	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-04 03:59:00+00","2025-09-05 04:00:00+00"]
202	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-11 03:59:00+00","2025-09-12 04:00:00+00"]
203	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-18 03:59:00+00","2025-09-19 04:00:00+00"]
204	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-25 03:59:00+00","2025-09-26 04:00:00+00"]
205	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-02 03:59:00+00","2025-10-03 04:00:00+00"]
206	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-09 03:59:00+00","2025-10-10 04:00:00+00"]
207	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-16 03:59:00+00","2025-10-17 04:00:00+00"]
208	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-23 03:59:00+00","2025-10-24 04:00:00+00"]
209	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-01 03:59:00+00","2024-11-02 04:00:00+00"]
210	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-08 04:59:00+00","2024-11-09 05:00:00+00"]
211	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-15 04:59:00+00","2024-11-16 05:00:00+00"]
212	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-22 04:59:00+00","2024-11-23 05:00:00+00"]
213	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-29 04:59:00+00","2024-11-30 05:00:00+00"]
214	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-06 04:59:00+00","2024-12-07 05:00:00+00"]
215	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-13 04:59:00+00","2024-12-14 05:00:00+00"]
216	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-20 04:59:00+00","2024-12-21 05:00:00+00"]
217	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-27 04:59:00+00","2024-12-28 05:00:00+00"]
218	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-03 04:59:00+00","2025-01-04 05:00:00+00"]
219	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-10 04:59:00+00","2025-01-11 05:00:00+00"]
220	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-17 04:59:00+00","2025-01-18 05:00:00+00"]
221	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-24 04:59:00+00","2025-01-25 05:00:00+00"]
222	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-31 04:59:00+00","2025-02-01 05:00:00+00"]
223	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-07 04:59:00+00","2025-02-08 05:00:00+00"]
224	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-14 04:59:00+00","2025-02-15 05:00:00+00"]
225	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-21 04:59:00+00","2025-02-22 05:00:00+00"]
226	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-28 04:59:00+00","2025-03-01 05:00:00+00"]
227	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-07 04:59:00+00","2025-03-08 05:00:00+00"]
228	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-14 03:59:00+00","2025-03-15 04:00:00+00"]
229	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-21 03:59:00+00","2025-03-22 04:00:00+00"]
230	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-28 03:59:00+00","2025-03-29 04:00:00+00"]
231	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-04 03:59:00+00","2025-04-05 04:00:00+00"]
232	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-11 03:59:00+00","2025-04-12 04:00:00+00"]
233	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-18 03:59:00+00","2025-04-19 04:00:00+00"]
234	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-25 03:59:00+00","2025-04-26 04:00:00+00"]
235	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-02 03:59:00+00","2025-05-03 04:00:00+00"]
236	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-09 03:59:00+00","2025-05-10 04:00:00+00"]
237	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-16 03:59:00+00","2025-05-17 04:00:00+00"]
238	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-23 03:59:00+00","2025-05-24 04:00:00+00"]
239	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-30 03:59:00+00","2025-05-31 04:00:00+00"]
240	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-06 03:59:00+00","2025-06-07 04:00:00+00"]
241	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-13 03:59:00+00","2025-06-14 04:00:00+00"]
242	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-20 03:59:00+00","2025-06-21 04:00:00+00"]
243	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-27 03:59:00+00","2025-06-28 04:00:00+00"]
244	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-04 03:59:00+00","2025-07-05 04:00:00+00"]
245	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-11 03:59:00+00","2025-07-12 04:00:00+00"]
246	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-18 03:59:00+00","2025-07-19 04:00:00+00"]
247	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-25 03:59:00+00","2025-07-26 04:00:00+00"]
248	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-01 03:59:00+00","2025-08-02 04:00:00+00"]
249	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-08 03:59:00+00","2025-08-09 04:00:00+00"]
250	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-15 03:59:00+00","2025-08-16 04:00:00+00"]
251	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-22 03:59:00+00","2025-08-23 04:00:00+00"]
252	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-29 03:59:00+00","2025-08-30 04:00:00+00"]
253	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-05 03:59:00+00","2025-09-06 04:00:00+00"]
254	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-12 03:59:00+00","2025-09-13 04:00:00+00"]
255	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-19 03:59:00+00","2025-09-20 04:00:00+00"]
256	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-26 03:59:00+00","2025-09-27 04:00:00+00"]
257	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-03 03:59:00+00","2025-10-04 04:00:00+00"]
258	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-10 03:59:00+00","2025-10-11 04:00:00+00"]
259	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-17 03:59:00+00","2025-10-18 04:00:00+00"]
260	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-24 03:59:00+00","2025-10-25 04:00:00+00"]
261	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-02 03:59:00+00","2024-11-03 04:00:00+00"]
262	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-09 04:59:00+00","2024-11-10 05:00:00+00"]
263	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-16 04:59:00+00","2024-11-17 05:00:00+00"]
264	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-23 04:59:00+00","2024-11-24 05:00:00+00"]
265	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-30 04:59:00+00","2024-12-01 05:00:00+00"]
266	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-07 04:59:00+00","2024-12-08 05:00:00+00"]
267	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-14 04:59:00+00","2024-12-15 05:00:00+00"]
268	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-21 04:59:00+00","2024-12-22 05:00:00+00"]
269	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-28 04:59:00+00","2024-12-29 05:00:00+00"]
270	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-04 04:59:00+00","2025-01-05 05:00:00+00"]
271	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-11 04:59:00+00","2025-01-12 05:00:00+00"]
272	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-18 04:59:00+00","2025-01-19 05:00:00+00"]
273	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-25 04:59:00+00","2025-01-26 05:00:00+00"]
274	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-01 04:59:00+00","2025-02-02 05:00:00+00"]
275	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-08 04:59:00+00","2025-02-09 05:00:00+00"]
276	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-15 04:59:00+00","2025-02-16 05:00:00+00"]
277	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-22 04:59:00+00","2025-02-23 05:00:00+00"]
278	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-01 04:59:00+00","2025-03-02 05:00:00+00"]
279	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-08 04:59:00+00","2025-03-09 05:00:00+00"]
280	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-15 03:59:00+00","2025-03-16 04:00:00+00"]
281	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-22 03:59:00+00","2025-03-23 04:00:00+00"]
282	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-29 03:59:00+00","2025-03-30 04:00:00+00"]
283	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-05 03:59:00+00","2025-04-06 04:00:00+00"]
284	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-12 03:59:00+00","2025-04-13 04:00:00+00"]
285	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-19 03:59:00+00","2025-04-20 04:00:00+00"]
286	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-26 03:59:00+00","2025-04-27 04:00:00+00"]
287	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-03 03:59:00+00","2025-05-04 04:00:00+00"]
288	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-10 03:59:00+00","2025-05-11 04:00:00+00"]
289	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-17 03:59:00+00","2025-05-18 04:00:00+00"]
290	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-24 03:59:00+00","2025-05-25 04:00:00+00"]
291	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-31 03:59:00+00","2025-06-01 04:00:00+00"]
292	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-07 03:59:00+00","2025-06-08 04:00:00+00"]
293	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-14 03:59:00+00","2025-06-15 04:00:00+00"]
294	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-21 03:59:00+00","2025-06-22 04:00:00+00"]
295	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-28 03:59:00+00","2025-06-29 04:00:00+00"]
296	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-05 03:59:00+00","2025-07-06 04:00:00+00"]
297	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-12 03:59:00+00","2025-07-13 04:00:00+00"]
298	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-19 03:59:00+00","2025-07-20 04:00:00+00"]
299	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-26 03:59:00+00","2025-07-27 04:00:00+00"]
300	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-02 03:59:00+00","2025-08-03 04:00:00+00"]
301	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-09 03:59:00+00","2025-08-10 04:00:00+00"]
302	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-16 03:59:00+00","2025-08-17 04:00:00+00"]
303	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-23 03:59:00+00","2025-08-24 04:00:00+00"]
304	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-30 03:59:00+00","2025-08-31 04:00:00+00"]
305	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-06 03:59:00+00","2025-09-07 04:00:00+00"]
306	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-13 03:59:00+00","2025-09-14 04:00:00+00"]
307	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-20 03:59:00+00","2025-09-21 04:00:00+00"]
308	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-27 03:59:00+00","2025-09-28 04:00:00+00"]
309	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-04 03:59:00+00","2025-10-05 04:00:00+00"]
310	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-11 03:59:00+00","2025-10-12 04:00:00+00"]
311	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-18 03:59:00+00","2025-10-19 04:00:00+00"]
312	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-25 03:59:00+00","2025-10-26 04:00:00+00"]
313	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-03 03:59:00+00","2024-11-04 05:00:00+00"]
314	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-10 04:59:00+00","2024-11-11 05:00:00+00"]
315	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-17 04:59:00+00","2024-11-18 05:00:00+00"]
316	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-11-24 04:59:00+00","2024-11-25 05:00:00+00"]
317	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-01 04:59:00+00","2024-12-02 05:00:00+00"]
318	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-08 04:59:00+00","2024-12-09 05:00:00+00"]
319	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-15 04:59:00+00","2024-12-16 05:00:00+00"]
320	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-22 04:59:00+00","2024-12-23 05:00:00+00"]
321	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-12-29 04:59:00+00","2024-12-30 05:00:00+00"]
322	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-05 04:59:00+00","2025-01-06 05:00:00+00"]
323	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-12 04:59:00+00","2025-01-13 05:00:00+00"]
324	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-19 04:59:00+00","2025-01-20 05:00:00+00"]
325	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-01-26 04:59:00+00","2025-01-27 05:00:00+00"]
326	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-02 04:59:00+00","2025-02-03 05:00:00+00"]
327	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-09 04:59:00+00","2025-02-10 05:00:00+00"]
328	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-16 04:59:00+00","2025-02-17 05:00:00+00"]
329	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-02-23 04:59:00+00","2025-02-24 05:00:00+00"]
330	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-02 04:59:00+00","2025-03-03 05:00:00+00"]
331	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-09 04:59:00+00","2025-03-10 04:00:00+00"]
332	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-16 03:59:00+00","2025-03-17 04:00:00+00"]
333	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-23 03:59:00+00","2025-03-24 04:00:00+00"]
334	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-03-30 03:59:00+00","2025-03-31 04:00:00+00"]
335	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-06 03:59:00+00","2025-04-07 04:00:00+00"]
336	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-13 03:59:00+00","2025-04-14 04:00:00+00"]
337	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-20 03:59:00+00","2025-04-21 04:00:00+00"]
338	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-04-27 03:59:00+00","2025-04-28 04:00:00+00"]
339	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-04 03:59:00+00","2025-05-05 04:00:00+00"]
340	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-11 03:59:00+00","2025-05-12 04:00:00+00"]
341	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-18 03:59:00+00","2025-05-19 04:00:00+00"]
342	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-05-25 03:59:00+00","2025-05-26 04:00:00+00"]
343	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-01 03:59:00+00","2025-06-02 04:00:00+00"]
344	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-08 03:59:00+00","2025-06-09 04:00:00+00"]
345	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-15 03:59:00+00","2025-06-16 04:00:00+00"]
346	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-22 03:59:00+00","2025-06-23 04:00:00+00"]
347	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-06-29 03:59:00+00","2025-06-30 04:00:00+00"]
348	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-06 03:59:00+00","2025-07-07 04:00:00+00"]
349	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-13 03:59:00+00","2025-07-14 04:00:00+00"]
350	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-20 03:59:00+00","2025-07-21 04:00:00+00"]
351	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-07-27 03:59:00+00","2025-07-28 04:00:00+00"]
352	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-03 03:59:00+00","2025-08-04 04:00:00+00"]
353	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-10 03:59:00+00","2025-08-11 04:00:00+00"]
354	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-17 03:59:00+00","2025-08-18 04:00:00+00"]
355	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-24 03:59:00+00","2025-08-25 04:00:00+00"]
356	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-08-31 03:59:00+00","2025-09-01 04:00:00+00"]
357	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-07 03:59:00+00","2025-09-08 04:00:00+00"]
358	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-14 03:59:00+00","2025-09-15 04:00:00+00"]
359	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-21 03:59:00+00","2025-09-22 04:00:00+00"]
360	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-09-28 03:59:00+00","2025-09-29 04:00:00+00"]
361	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-05 03:59:00+00","2025-10-06 04:00:00+00"]
362	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-12 03:59:00+00","2025-10-13 04:00:00+00"]
363	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-19 03:59:00+00","2025-10-20 04:00:00+00"]
364	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2025-10-26 03:59:00+00","2025-10-27 04:00:00+00"]
365	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-10-28 03:59:00+00","2024-10-29 04:00:00+00"]
366	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-04 04:59:00+00","2024-11-05 05:00:00+00"]
367	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-11 04:59:00+00","2024-11-12 05:00:00+00"]
368	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-18 04:59:00+00","2024-11-19 05:00:00+00"]
369	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-25 04:59:00+00","2024-11-26 05:00:00+00"]
370	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-02 04:59:00+00","2024-12-03 05:00:00+00"]
371	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-09 04:59:00+00","2024-12-10 05:00:00+00"]
372	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-16 04:59:00+00","2024-12-17 05:00:00+00"]
373	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-23 04:59:00+00","2024-12-24 05:00:00+00"]
374	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-30 04:59:00+00","2024-12-31 05:00:00+00"]
375	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-06 04:59:00+00","2025-01-07 05:00:00+00"]
376	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-13 04:59:00+00","2025-01-14 05:00:00+00"]
377	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-20 04:59:00+00","2025-01-21 05:00:00+00"]
378	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-27 04:59:00+00","2025-01-28 05:00:00+00"]
379	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-03 04:59:00+00","2025-02-04 05:00:00+00"]
380	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-10 04:59:00+00","2025-02-11 05:00:00+00"]
381	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-17 04:59:00+00","2025-02-18 05:00:00+00"]
382	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-24 04:59:00+00","2025-02-25 05:00:00+00"]
383	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-03 04:59:00+00","2025-03-04 05:00:00+00"]
384	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-10 03:59:00+00","2025-03-11 04:00:00+00"]
385	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-17 03:59:00+00","2025-03-18 04:00:00+00"]
386	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-24 03:59:00+00","2025-03-25 04:00:00+00"]
387	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-31 03:59:00+00","2025-04-01 04:00:00+00"]
388	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-07 03:59:00+00","2025-04-08 04:00:00+00"]
389	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-14 03:59:00+00","2025-04-15 04:00:00+00"]
390	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-21 03:59:00+00","2025-04-22 04:00:00+00"]
391	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-28 03:59:00+00","2025-04-29 04:00:00+00"]
392	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-05 03:59:00+00","2025-05-06 04:00:00+00"]
393	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-12 03:59:00+00","2025-05-13 04:00:00+00"]
394	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-19 03:59:00+00","2025-05-20 04:00:00+00"]
395	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-26 03:59:00+00","2025-05-27 04:00:00+00"]
396	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-02 03:59:00+00","2025-06-03 04:00:00+00"]
397	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-09 03:59:00+00","2025-06-10 04:00:00+00"]
398	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-16 03:59:00+00","2025-06-17 04:00:00+00"]
399	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-23 03:59:00+00","2025-06-24 04:00:00+00"]
400	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-30 03:59:00+00","2025-07-01 04:00:00+00"]
401	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-07 03:59:00+00","2025-07-08 04:00:00+00"]
402	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-14 03:59:00+00","2025-07-15 04:00:00+00"]
403	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-21 03:59:00+00","2025-07-22 04:00:00+00"]
404	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-28 03:59:00+00","2025-07-29 04:00:00+00"]
405	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-04 03:59:00+00","2025-08-05 04:00:00+00"]
406	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-11 03:59:00+00","2025-08-12 04:00:00+00"]
407	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-18 03:59:00+00","2025-08-19 04:00:00+00"]
408	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-25 03:59:00+00","2025-08-26 04:00:00+00"]
409	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-01 03:59:00+00","2025-09-02 04:00:00+00"]
410	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-08 03:59:00+00","2025-09-09 04:00:00+00"]
411	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-15 03:59:00+00","2025-09-16 04:00:00+00"]
412	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-22 03:59:00+00","2025-09-23 04:00:00+00"]
413	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-29 03:59:00+00","2025-09-30 04:00:00+00"]
414	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-06 03:59:00+00","2025-10-07 04:00:00+00"]
415	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-13 03:59:00+00","2025-10-14 04:00:00+00"]
416	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-20 03:59:00+00","2025-10-21 04:00:00+00"]
417	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-10-29 03:59:00+00","2024-10-30 04:00:00+00"]
418	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-05 04:59:00+00","2024-11-06 05:00:00+00"]
419	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-12 04:59:00+00","2024-11-13 05:00:00+00"]
420	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-19 04:59:00+00","2024-11-20 05:00:00+00"]
421	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-26 04:59:00+00","2024-11-27 05:00:00+00"]
422	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-03 04:59:00+00","2024-12-04 05:00:00+00"]
423	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-10 04:59:00+00","2024-12-11 05:00:00+00"]
424	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-17 04:59:00+00","2024-12-18 05:00:00+00"]
425	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-24 04:59:00+00","2024-12-25 05:00:00+00"]
426	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-31 04:59:00+00","2025-01-01 05:00:00+00"]
427	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-07 04:59:00+00","2025-01-08 05:00:00+00"]
428	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-14 04:59:00+00","2025-01-15 05:00:00+00"]
429	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-21 04:59:00+00","2025-01-22 05:00:00+00"]
430	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-28 04:59:00+00","2025-01-29 05:00:00+00"]
431	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-04 04:59:00+00","2025-02-05 05:00:00+00"]
432	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-11 04:59:00+00","2025-02-12 05:00:00+00"]
433	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-18 04:59:00+00","2025-02-19 05:00:00+00"]
434	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-25 04:59:00+00","2025-02-26 05:00:00+00"]
435	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-04 04:59:00+00","2025-03-05 05:00:00+00"]
436	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-11 03:59:00+00","2025-03-12 04:00:00+00"]
437	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-18 03:59:00+00","2025-03-19 04:00:00+00"]
438	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-25 03:59:00+00","2025-03-26 04:00:00+00"]
439	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-01 03:59:00+00","2025-04-02 04:00:00+00"]
440	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-08 03:59:00+00","2025-04-09 04:00:00+00"]
441	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-15 03:59:00+00","2025-04-16 04:00:00+00"]
442	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-22 03:59:00+00","2025-04-23 04:00:00+00"]
443	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-29 03:59:00+00","2025-04-30 04:00:00+00"]
444	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-06 03:59:00+00","2025-05-07 04:00:00+00"]
445	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-13 03:59:00+00","2025-05-14 04:00:00+00"]
446	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-20 03:59:00+00","2025-05-21 04:00:00+00"]
447	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-27 03:59:00+00","2025-05-28 04:00:00+00"]
448	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-03 03:59:00+00","2025-06-04 04:00:00+00"]
449	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-10 03:59:00+00","2025-06-11 04:00:00+00"]
450	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-17 03:59:00+00","2025-06-18 04:00:00+00"]
451	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-24 03:59:00+00","2025-06-25 04:00:00+00"]
452	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-01 03:59:00+00","2025-07-02 04:00:00+00"]
453	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-08 03:59:00+00","2025-07-09 04:00:00+00"]
454	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-15 03:59:00+00","2025-07-16 04:00:00+00"]
455	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-22 03:59:00+00","2025-07-23 04:00:00+00"]
456	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-29 03:59:00+00","2025-07-30 04:00:00+00"]
457	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-05 03:59:00+00","2025-08-06 04:00:00+00"]
458	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-12 03:59:00+00","2025-08-13 04:00:00+00"]
459	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-19 03:59:00+00","2025-08-20 04:00:00+00"]
460	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-26 03:59:00+00","2025-08-27 04:00:00+00"]
461	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-02 03:59:00+00","2025-09-03 04:00:00+00"]
462	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-09 03:59:00+00","2025-09-10 04:00:00+00"]
463	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-16 03:59:00+00","2025-09-17 04:00:00+00"]
464	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-23 03:59:00+00","2025-09-24 04:00:00+00"]
465	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-30 03:59:00+00","2025-10-01 04:00:00+00"]
466	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-07 03:59:00+00","2025-10-08 04:00:00+00"]
467	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-14 03:59:00+00","2025-10-15 04:00:00+00"]
468	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-21 03:59:00+00","2025-10-22 04:00:00+00"]
469	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-10-30 03:59:00+00","2024-10-31 04:00:00+00"]
470	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-06 04:59:00+00","2024-11-07 05:00:00+00"]
471	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-13 04:59:00+00","2024-11-14 05:00:00+00"]
472	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-20 04:59:00+00","2024-11-21 05:00:00+00"]
473	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-27 04:59:00+00","2024-11-28 05:00:00+00"]
474	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-04 04:59:00+00","2024-12-05 05:00:00+00"]
475	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-11 04:59:00+00","2024-12-12 05:00:00+00"]
476	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-18 04:59:00+00","2024-12-19 05:00:00+00"]
477	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-25 04:59:00+00","2024-12-26 05:00:00+00"]
478	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-01 04:59:00+00","2025-01-02 05:00:00+00"]
479	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-08 04:59:00+00","2025-01-09 05:00:00+00"]
480	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-15 04:59:00+00","2025-01-16 05:00:00+00"]
481	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-22 04:59:00+00","2025-01-23 05:00:00+00"]
482	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-29 04:59:00+00","2025-01-30 05:00:00+00"]
483	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-05 04:59:00+00","2025-02-06 05:00:00+00"]
484	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-12 04:59:00+00","2025-02-13 05:00:00+00"]
485	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-19 04:59:00+00","2025-02-20 05:00:00+00"]
486	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-26 04:59:00+00","2025-02-27 05:00:00+00"]
487	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-05 04:59:00+00","2025-03-06 05:00:00+00"]
488	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-12 03:59:00+00","2025-03-13 04:00:00+00"]
489	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-19 03:59:00+00","2025-03-20 04:00:00+00"]
490	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-26 03:59:00+00","2025-03-27 04:00:00+00"]
491	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-02 03:59:00+00","2025-04-03 04:00:00+00"]
492	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-09 03:59:00+00","2025-04-10 04:00:00+00"]
493	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-16 03:59:00+00","2025-04-17 04:00:00+00"]
494	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-23 03:59:00+00","2025-04-24 04:00:00+00"]
495	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-30 03:59:00+00","2025-05-01 04:00:00+00"]
496	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-07 03:59:00+00","2025-05-08 04:00:00+00"]
497	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-14 03:59:00+00","2025-05-15 04:00:00+00"]
498	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-21 03:59:00+00","2025-05-22 04:00:00+00"]
499	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-28 03:59:00+00","2025-05-29 04:00:00+00"]
500	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-04 03:59:00+00","2025-06-05 04:00:00+00"]
501	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-11 03:59:00+00","2025-06-12 04:00:00+00"]
502	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-18 03:59:00+00","2025-06-19 04:00:00+00"]
503	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-25 03:59:00+00","2025-06-26 04:00:00+00"]
504	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-02 03:59:00+00","2025-07-03 04:00:00+00"]
505	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-09 03:59:00+00","2025-07-10 04:00:00+00"]
506	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-16 03:59:00+00","2025-07-17 04:00:00+00"]
507	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-23 03:59:00+00","2025-07-24 04:00:00+00"]
508	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-30 03:59:00+00","2025-07-31 04:00:00+00"]
509	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-06 03:59:00+00","2025-08-07 04:00:00+00"]
510	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-13 03:59:00+00","2025-08-14 04:00:00+00"]
511	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-20 03:59:00+00","2025-08-21 04:00:00+00"]
512	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-27 03:59:00+00","2025-08-28 04:00:00+00"]
513	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-03 03:59:00+00","2025-09-04 04:00:00+00"]
514	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-10 03:59:00+00","2025-09-11 04:00:00+00"]
515	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-17 03:59:00+00","2025-09-18 04:00:00+00"]
516	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-24 03:59:00+00","2025-09-25 04:00:00+00"]
517	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-01 03:59:00+00","2025-10-02 04:00:00+00"]
518	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-08 03:59:00+00","2025-10-09 04:00:00+00"]
519	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-15 03:59:00+00","2025-10-16 04:00:00+00"]
520	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-22 03:59:00+00","2025-10-23 04:00:00+00"]
521	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-10-31 03:59:00+00","2024-11-01 04:00:00+00"]
522	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-07 04:59:00+00","2024-11-08 05:00:00+00"]
523	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-14 04:59:00+00","2024-11-15 05:00:00+00"]
524	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-21 04:59:00+00","2024-11-22 05:00:00+00"]
525	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-28 04:59:00+00","2024-11-29 05:00:00+00"]
526	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-05 04:59:00+00","2024-12-06 05:00:00+00"]
527	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-12 04:59:00+00","2024-12-13 05:00:00+00"]
528	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-19 04:59:00+00","2024-12-20 05:00:00+00"]
529	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-26 04:59:00+00","2024-12-27 05:00:00+00"]
530	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-02 04:59:00+00","2025-01-03 05:00:00+00"]
531	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-09 04:59:00+00","2025-01-10 05:00:00+00"]
532	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-16 04:59:00+00","2025-01-17 05:00:00+00"]
533	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-23 04:59:00+00","2025-01-24 05:00:00+00"]
534	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-30 04:59:00+00","2025-01-31 05:00:00+00"]
535	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-06 04:59:00+00","2025-02-07 05:00:00+00"]
536	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-13 04:59:00+00","2025-02-14 05:00:00+00"]
537	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-20 04:59:00+00","2025-02-21 05:00:00+00"]
538	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-27 04:59:00+00","2025-02-28 05:00:00+00"]
539	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-06 04:59:00+00","2025-03-07 05:00:00+00"]
540	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-13 03:59:00+00","2025-03-14 04:00:00+00"]
541	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-20 03:59:00+00","2025-03-21 04:00:00+00"]
542	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-27 03:59:00+00","2025-03-28 04:00:00+00"]
543	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-03 03:59:00+00","2025-04-04 04:00:00+00"]
544	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-10 03:59:00+00","2025-04-11 04:00:00+00"]
545	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-17 03:59:00+00","2025-04-18 04:00:00+00"]
546	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-24 03:59:00+00","2025-04-25 04:00:00+00"]
547	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-01 03:59:00+00","2025-05-02 04:00:00+00"]
548	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-08 03:59:00+00","2025-05-09 04:00:00+00"]
549	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-15 03:59:00+00","2025-05-16 04:00:00+00"]
550	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-22 03:59:00+00","2025-05-23 04:00:00+00"]
551	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-29 03:59:00+00","2025-05-30 04:00:00+00"]
552	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-05 03:59:00+00","2025-06-06 04:00:00+00"]
553	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-12 03:59:00+00","2025-06-13 04:00:00+00"]
554	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-19 03:59:00+00","2025-06-20 04:00:00+00"]
555	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-26 03:59:00+00","2025-06-27 04:00:00+00"]
556	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-03 03:59:00+00","2025-07-04 04:00:00+00"]
557	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-10 03:59:00+00","2025-07-11 04:00:00+00"]
558	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-17 03:59:00+00","2025-07-18 04:00:00+00"]
559	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-24 03:59:00+00","2025-07-25 04:00:00+00"]
560	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-31 03:59:00+00","2025-08-01 04:00:00+00"]
561	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-07 03:59:00+00","2025-08-08 04:00:00+00"]
562	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-14 03:59:00+00","2025-08-15 04:00:00+00"]
563	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-21 03:59:00+00","2025-08-22 04:00:00+00"]
564	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-28 03:59:00+00","2025-08-29 04:00:00+00"]
565	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-04 03:59:00+00","2025-09-05 04:00:00+00"]
566	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-11 03:59:00+00","2025-09-12 04:00:00+00"]
567	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-18 03:59:00+00","2025-09-19 04:00:00+00"]
568	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-25 03:59:00+00","2025-09-26 04:00:00+00"]
569	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-02 03:59:00+00","2025-10-03 04:00:00+00"]
570	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-09 03:59:00+00","2025-10-10 04:00:00+00"]
571	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-16 03:59:00+00","2025-10-17 04:00:00+00"]
572	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-23 03:59:00+00","2025-10-24 04:00:00+00"]
573	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-01 03:59:00+00","2024-11-02 04:00:00+00"]
574	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-08 04:59:00+00","2024-11-09 05:00:00+00"]
575	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-15 04:59:00+00","2024-11-16 05:00:00+00"]
576	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-22 04:59:00+00","2024-11-23 05:00:00+00"]
577	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-29 04:59:00+00","2024-11-30 05:00:00+00"]
578	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-06 04:59:00+00","2024-12-07 05:00:00+00"]
579	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-13 04:59:00+00","2024-12-14 05:00:00+00"]
580	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-20 04:59:00+00","2024-12-21 05:00:00+00"]
581	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-27 04:59:00+00","2024-12-28 05:00:00+00"]
582	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-03 04:59:00+00","2025-01-04 05:00:00+00"]
583	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-10 04:59:00+00","2025-01-11 05:00:00+00"]
584	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-17 04:59:00+00","2025-01-18 05:00:00+00"]
585	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-24 04:59:00+00","2025-01-25 05:00:00+00"]
586	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-31 04:59:00+00","2025-02-01 05:00:00+00"]
587	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-07 04:59:00+00","2025-02-08 05:00:00+00"]
588	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-14 04:59:00+00","2025-02-15 05:00:00+00"]
589	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-21 04:59:00+00","2025-02-22 05:00:00+00"]
590	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-28 04:59:00+00","2025-03-01 05:00:00+00"]
591	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-07 04:59:00+00","2025-03-08 05:00:00+00"]
592	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-14 03:59:00+00","2025-03-15 04:00:00+00"]
593	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-21 03:59:00+00","2025-03-22 04:00:00+00"]
594	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-28 03:59:00+00","2025-03-29 04:00:00+00"]
595	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-04 03:59:00+00","2025-04-05 04:00:00+00"]
596	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-11 03:59:00+00","2025-04-12 04:00:00+00"]
597	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-18 03:59:00+00","2025-04-19 04:00:00+00"]
598	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-25 03:59:00+00","2025-04-26 04:00:00+00"]
599	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-02 03:59:00+00","2025-05-03 04:00:00+00"]
600	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-09 03:59:00+00","2025-05-10 04:00:00+00"]
601	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-16 03:59:00+00","2025-05-17 04:00:00+00"]
602	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-23 03:59:00+00","2025-05-24 04:00:00+00"]
603	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-30 03:59:00+00","2025-05-31 04:00:00+00"]
604	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-06 03:59:00+00","2025-06-07 04:00:00+00"]
605	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-13 03:59:00+00","2025-06-14 04:00:00+00"]
606	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-20 03:59:00+00","2025-06-21 04:00:00+00"]
607	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-27 03:59:00+00","2025-06-28 04:00:00+00"]
608	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-04 03:59:00+00","2025-07-05 04:00:00+00"]
609	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-11 03:59:00+00","2025-07-12 04:00:00+00"]
610	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-18 03:59:00+00","2025-07-19 04:00:00+00"]
611	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-25 03:59:00+00","2025-07-26 04:00:00+00"]
612	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-01 03:59:00+00","2025-08-02 04:00:00+00"]
613	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-08 03:59:00+00","2025-08-09 04:00:00+00"]
614	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-15 03:59:00+00","2025-08-16 04:00:00+00"]
615	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-22 03:59:00+00","2025-08-23 04:00:00+00"]
616	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-29 03:59:00+00","2025-08-30 04:00:00+00"]
617	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-05 03:59:00+00","2025-09-06 04:00:00+00"]
618	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-12 03:59:00+00","2025-09-13 04:00:00+00"]
619	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-19 03:59:00+00","2025-09-20 04:00:00+00"]
620	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-26 03:59:00+00","2025-09-27 04:00:00+00"]
621	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-03 03:59:00+00","2025-10-04 04:00:00+00"]
622	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-10 03:59:00+00","2025-10-11 04:00:00+00"]
623	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-17 03:59:00+00","2025-10-18 04:00:00+00"]
624	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-24 03:59:00+00","2025-10-25 04:00:00+00"]
625	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-02 03:59:00+00","2024-11-03 04:00:00+00"]
626	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-09 04:59:00+00","2024-11-10 05:00:00+00"]
627	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-16 04:59:00+00","2024-11-17 05:00:00+00"]
628	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-23 04:59:00+00","2024-11-24 05:00:00+00"]
629	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-30 04:59:00+00","2024-12-01 05:00:00+00"]
630	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-07 04:59:00+00","2024-12-08 05:00:00+00"]
631	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-14 04:59:00+00","2024-12-15 05:00:00+00"]
632	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-21 04:59:00+00","2024-12-22 05:00:00+00"]
633	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-28 04:59:00+00","2024-12-29 05:00:00+00"]
634	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-04 04:59:00+00","2025-01-05 05:00:00+00"]
635	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-11 04:59:00+00","2025-01-12 05:00:00+00"]
636	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-18 04:59:00+00","2025-01-19 05:00:00+00"]
637	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-25 04:59:00+00","2025-01-26 05:00:00+00"]
638	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-01 04:59:00+00","2025-02-02 05:00:00+00"]
639	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-08 04:59:00+00","2025-02-09 05:00:00+00"]
640	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-15 04:59:00+00","2025-02-16 05:00:00+00"]
641	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-22 04:59:00+00","2025-02-23 05:00:00+00"]
642	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-01 04:59:00+00","2025-03-02 05:00:00+00"]
643	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-08 04:59:00+00","2025-03-09 05:00:00+00"]
644	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-15 03:59:00+00","2025-03-16 04:00:00+00"]
645	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-22 03:59:00+00","2025-03-23 04:00:00+00"]
646	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-29 03:59:00+00","2025-03-30 04:00:00+00"]
647	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-05 03:59:00+00","2025-04-06 04:00:00+00"]
648	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-12 03:59:00+00","2025-04-13 04:00:00+00"]
649	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-19 03:59:00+00","2025-04-20 04:00:00+00"]
650	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-26 03:59:00+00","2025-04-27 04:00:00+00"]
651	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-03 03:59:00+00","2025-05-04 04:00:00+00"]
652	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-10 03:59:00+00","2025-05-11 04:00:00+00"]
653	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-17 03:59:00+00","2025-05-18 04:00:00+00"]
654	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-24 03:59:00+00","2025-05-25 04:00:00+00"]
655	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-31 03:59:00+00","2025-06-01 04:00:00+00"]
656	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-07 03:59:00+00","2025-06-08 04:00:00+00"]
657	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-14 03:59:00+00","2025-06-15 04:00:00+00"]
658	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-21 03:59:00+00","2025-06-22 04:00:00+00"]
659	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-28 03:59:00+00","2025-06-29 04:00:00+00"]
660	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-05 03:59:00+00","2025-07-06 04:00:00+00"]
661	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-12 03:59:00+00","2025-07-13 04:00:00+00"]
662	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-19 03:59:00+00","2025-07-20 04:00:00+00"]
663	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-26 03:59:00+00","2025-07-27 04:00:00+00"]
664	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-02 03:59:00+00","2025-08-03 04:00:00+00"]
665	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-09 03:59:00+00","2025-08-10 04:00:00+00"]
666	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-16 03:59:00+00","2025-08-17 04:00:00+00"]
667	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-23 03:59:00+00","2025-08-24 04:00:00+00"]
668	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-30 03:59:00+00","2025-08-31 04:00:00+00"]
669	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-06 03:59:00+00","2025-09-07 04:00:00+00"]
670	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-13 03:59:00+00","2025-09-14 04:00:00+00"]
671	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-20 03:59:00+00","2025-09-21 04:00:00+00"]
672	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-27 03:59:00+00","2025-09-28 04:00:00+00"]
673	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-04 03:59:00+00","2025-10-05 04:00:00+00"]
674	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-11 03:59:00+00","2025-10-12 04:00:00+00"]
675	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-18 03:59:00+00","2025-10-19 04:00:00+00"]
676	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-25 03:59:00+00","2025-10-26 04:00:00+00"]
677	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-03 03:59:00+00","2024-11-04 05:00:00+00"]
678	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-10 04:59:00+00","2024-11-11 05:00:00+00"]
679	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-17 04:59:00+00","2024-11-18 05:00:00+00"]
680	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-11-24 04:59:00+00","2024-11-25 05:00:00+00"]
681	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-01 04:59:00+00","2024-12-02 05:00:00+00"]
682	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-08 04:59:00+00","2024-12-09 05:00:00+00"]
683	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-15 04:59:00+00","2024-12-16 05:00:00+00"]
684	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-22 04:59:00+00","2024-12-23 05:00:00+00"]
685	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-12-29 04:59:00+00","2024-12-30 05:00:00+00"]
686	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-05 04:59:00+00","2025-01-06 05:00:00+00"]
687	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-12 04:59:00+00","2025-01-13 05:00:00+00"]
688	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-19 04:59:00+00","2025-01-20 05:00:00+00"]
689	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-01-26 04:59:00+00","2025-01-27 05:00:00+00"]
690	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-02 04:59:00+00","2025-02-03 05:00:00+00"]
691	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-09 04:59:00+00","2025-02-10 05:00:00+00"]
692	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-16 04:59:00+00","2025-02-17 05:00:00+00"]
693	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-02-23 04:59:00+00","2025-02-24 05:00:00+00"]
694	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-02 04:59:00+00","2025-03-03 05:00:00+00"]
695	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-09 04:59:00+00","2025-03-10 04:00:00+00"]
696	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-16 03:59:00+00","2025-03-17 04:00:00+00"]
697	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-23 03:59:00+00","2025-03-24 04:00:00+00"]
698	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-03-30 03:59:00+00","2025-03-31 04:00:00+00"]
699	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-06 03:59:00+00","2025-04-07 04:00:00+00"]
700	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-13 03:59:00+00","2025-04-14 04:00:00+00"]
701	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-20 03:59:00+00","2025-04-21 04:00:00+00"]
702	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-04-27 03:59:00+00","2025-04-28 04:00:00+00"]
703	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-04 03:59:00+00","2025-05-05 04:00:00+00"]
704	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-11 03:59:00+00","2025-05-12 04:00:00+00"]
705	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-18 03:59:00+00","2025-05-19 04:00:00+00"]
706	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-05-25 03:59:00+00","2025-05-26 04:00:00+00"]
707	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-01 03:59:00+00","2025-06-02 04:00:00+00"]
708	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-08 03:59:00+00","2025-06-09 04:00:00+00"]
709	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-15 03:59:00+00","2025-06-16 04:00:00+00"]
710	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-22 03:59:00+00","2025-06-23 04:00:00+00"]
711	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-06-29 03:59:00+00","2025-06-30 04:00:00+00"]
712	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-06 03:59:00+00","2025-07-07 04:00:00+00"]
713	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-13 03:59:00+00","2025-07-14 04:00:00+00"]
714	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-20 03:59:00+00","2025-07-21 04:00:00+00"]
715	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-07-27 03:59:00+00","2025-07-28 04:00:00+00"]
716	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-03 03:59:00+00","2025-08-04 04:00:00+00"]
717	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-10 03:59:00+00","2025-08-11 04:00:00+00"]
718	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-17 03:59:00+00","2025-08-18 04:00:00+00"]
719	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-24 03:59:00+00","2025-08-25 04:00:00+00"]
720	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-08-31 03:59:00+00","2025-09-01 04:00:00+00"]
721	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-07 03:59:00+00","2025-09-08 04:00:00+00"]
722	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-14 03:59:00+00","2025-09-15 04:00:00+00"]
723	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-21 03:59:00+00","2025-09-22 04:00:00+00"]
724	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-09-28 03:59:00+00","2025-09-29 04:00:00+00"]
725	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-05 03:59:00+00","2025-10-06 04:00:00+00"]
726	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-12 03:59:00+00","2025-10-13 04:00:00+00"]
727	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-19 03:59:00+00","2025-10-20 04:00:00+00"]
728	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2025-10-26 03:59:00+00","2025-10-27 04:00:00+00"]
\.


--
-- Data for Name: parking_spaces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parking_spaces (id, owner, location, is_paid, name, availability_schedule, photos, verification_status, cancellation_policy, created_at, updated_at, address, price, photo_timestamp, verification_photos, avg_availability_rating, avg_cleanliness_rating, avg_total_rating, ratings_count_availability, ratings_count_cleanliness, is_taken) FROM stdin;
257b90aa-08a5-4a0f-ac22-68a27ec25c48	4a7cd564-325e-4834-b78c-78b5cb7f520f	0101000020E610000080D99832CBBA55C0FC9A9B25B7364440	f	Spot Logged at 03:03 AM, November 01 2024	[]	{/static/images/71477100-0b98-4156-a89d-440a08b30a8f.jpg}	unverified	\N	2024-11-01 07:03:40.109336+00	2024-11-01 07:03:40.109336+00		0	2024-11-01 07:03:40.109336+00	\N	\N	\N	\N	0	0	f
fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	4a7cd564-325e-4834-b78c-78b5cb7f520f	0101000020E610000074A1A822CBBA55C0968D7340B7364440	t	Test Spot	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{/static/images/7e7bfe9b-98d5-493a-8b6c-dbd4c9049dd2.png}	unverified	\N	2024-11-01 05:40:16.318653+00	2024-11-01 05:40:16.318653+00	Hello Address	1	2024-11-01 05:40:16.318653+00	\N	\N	\N	\N	0	0	f
fe9e327c-e38e-48e0-82b6-69a2dc300cc3	4a7cd564-325e-4834-b78c-78b5cb7f520f	0101000020E6100000B6792D32CBBA55C0EA8BCE43B7364440	t	edrdfrc	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{/static/images/eda6623f-bb7a-42fa-99bb-c0b179eaa4ab.jpg}	unverified	\N	2024-11-01 03:38:34.306144+00	2024-11-01 03:38:34.306144+00	frfcrfc	15	2024-11-01 03:38:34.306144+00	\N	5.00	1.00	3.67	3	2	f
\.


--
-- Data for Name: ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ratings (id, parking_space_id, user_id, availability_rating, cleanliness_rating, created_at, updated_at) FROM stdin;
b431cb6e-4efb-4ba7-a36e-914ee8aa2e22	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	71683361-f3d5-4474-a886-c34472b34d39	5	\N	2024-11-01 06:44:31.568823+00	2024-11-01 06:44:31.568823+00
f79bb411-6654-416a-b40c-41499beca77d	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	4a7cd564-325e-4834-b78c-78b5cb7f520f	5	1	2024-11-01 06:44:10.804035+00	2024-11-01 07:15:37.40712+00
90334a51-c4b5-4dbe-b4bf-49b21f8fdaa2	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	f58d5dfa-bff2-4f68-9191-544404440ae6	5	1	2024-11-01 05:12:26.086817+00	2024-11-01 07:15:38.269117+00
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, reservation_id, description, type, status, admin_response, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reservations (id, parking_space_id, renter_id, car_info_id, status, created_at, updated_at, "time") FROM stdin;
7e324da5-ac15-4705-b72b-3267b86b8022	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	f58d5dfa-bff2-4f68-9191-544404440ae6	41288575-3c97-4eb9-8e80-94a7e1b970c0	booked	2024-11-01 03:39:51.491476+00	2024-11-01 03:39:51.491476+00	["2024-10-26 04:39:00+00","2024-11-08 04:39:00+00"]
8b42a72f-da24-4e68-955d-40c0b3ab0012	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	f58d5dfa-bff2-4f68-9191-544404440ae6	41288575-3c97-4eb9-8e80-94a7e1b970c0	booked	2024-11-01 05:10:22.974365+00	2024-11-01 05:10:22.974365+00	["2024-10-17 09:10:00+00","2024-10-17 10:10:00+00"]
85c1e430-1f13-4cb4-932c-78ed5d0f6455	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	71683361-f3d5-4474-a886-c34472b34d39	a232dfa7-9d3f-48b2-bd27-79ea0bcb7cb1	booked	2024-11-01 06:12:39.455164+00	2024-11-01 06:12:39.455164+00	["2024-10-19 06:12:00+00","2024-10-20 07:12:00+00"]
c5965182-8193-4981-81f0-ba04e507ebb2	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	71683361-f3d5-4474-a886-c34472b34d39	a232dfa7-9d3f-48b2-bd27-79ea0bcb7cb1	booked	2024-11-01 06:12:56.54858+00	2024-11-01 06:12:56.54858+00	["2024-10-21 07:12:00+00","2024-10-23 07:12:00+00"]
4c771c55-7263-4932-b2c0-16f0b471357b	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	4a7cd564-325e-4834-b78c-78b5cb7f520f	ecfa1350-1431-4b40-b13d-64899f76b137	booked	2024-11-01 06:15:34.604489+00	2024-11-01 06:15:34.604489+00	["2024-10-18 10:15:00+00","2024-10-18 11:15:00+00"]
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: timetable_coalesce; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timetable_coalesce (id, parking_space_id, "time") FROM stdin;
1	fe9e327c-e38e-48e0-82b6-69a2dc300cc3	["2024-10-28 03:59:00+00","2025-10-27 04:00:00+00"]
3	fc7119c0-05f9-48b8-a19e-e4b1c9a7c122	["2024-10-28 03:59:00+00","2025-10-27 04:00:00+00"]
\.


--
-- Data for Name: user_delete_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_delete_requests (id, user_id, token, expiry) FROM stdin;
\.


--
-- Data for Name: user_pw_reset_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_pw_reset_requests (id, user_id, token, expiry) FROM stdin;
1	4a7cd564-325e-4834-b78c-78b5cb7f520f	8OBUuPVlhn5lCGzpuIT_xq4rmN8GMfYr9miufiLE6Mw	2024-11-01 09:41:39.264224
2	f58d5dfa-bff2-4f68-9191-544404440ae6	0DGI2z8UeVpPLjKkodcUq2DnNpGVBkKwbPZk-2D5j8I	2024-11-01 09:44:09.21822
3	71683361-f3d5-4474-a886-c34472b34d39	u6a-PGRK_-BqhPzpN6gJ3r804dxYuCEVH2mlQ2PJ4fg	2024-11-01 09:44:34.817338
\.


--
-- Data for Name: user_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_tokens (id, user_id, token, expiry) FROM stdin;
7	4a7cd564-325e-4834-b78c-78b5cb7f520f	xpark_aPCd3Z73zG_63kSq3ogFyP4TjWoRPkLTBWjP7qj6WeQ	2024-12-01 09:13:56.298249
8	f58d5dfa-bff2-4f68-9191-544404440ae6	xpark_C8ok9ua2XW18_YH-mj-vT0a9QHKaEIfxD_qVWSHvs44	2024-12-01 09:14:23.879268
9	71683361-f3d5-4474-a886-c34472b34d39	xpark_wMlfsSJcDK2Mxk_5e_F7AemX9TygvRZPAuWJ60Qiphw	2024-12-01 09:14:55.76205
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, deleted_at) FROM stdin;
4a7cd564-325e-4834-b78c-78b5cb7f520f	Test User 1	xparkusr1@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$Jcy61W75fuidrn/kiaRB7Q$+1nKtr5vFJApjLqGJpSSSglauB3EBT2NqYtwWWtj8S8	\N
f58d5dfa-bff2-4f68-9191-544404440ae6	Test User 2	xparkusr2@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$9BSyEznmpscHsPixTXa+3w$DQVV2W25j9Qny02j9pLGcAv9nKpIDRZoQlObXDgtyaU	\N
71683361-f3d5-4474-a886-c34472b34d39	Test User 3	xparkusr3@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$K6wjfqhZc0KbwhUtwUlgfQ$EC6om0FeGTGmWi+lh2oed8WnEKrkErRQFUKOdbT5kWE	\N
\.


--
-- Name: paid_parking_allowed_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.paid_parking_allowed_availability_id_seq', 728, true);


--
-- Name: timetable_coalesce_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timetable_coalesce_id_seq', 4, true);


--
-- Name: user_delete_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_delete_requests_id_seq', 1, false);


--
-- Name: user_pw_reset_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_pw_reset_requests_id_seq', 3, true);


--
-- Name: user_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_tokens_id_seq', 9, true);


--
-- Name: cars cars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (migration_name);


--
-- Name: paid_parking_allowed_availability paid_parking_allowed_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability
    ADD CONSTRAINT paid_parking_allowed_availability_pkey PRIMARY KEY (id);


--
-- Name: parking_spaces parking_spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces
    ADD CONSTRAINT parking_spaces_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_parking_space_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_parking_space_id_user_id_key UNIQUE (parking_space_id, user_id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: timetable_coalesce timetable_coalesce_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_coalesce
    ADD CONSTRAINT timetable_coalesce_pkey PRIMARY KEY (id);


--
-- Name: cars unique_license_plate; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT unique_license_plate UNIQUE (license_plate, license_plate_state);


--
-- Name: user_delete_requests user_delete_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_delete_requests
    ADD CONSTRAINT user_delete_requests_pkey PRIMARY KEY (id);


--
-- Name: user_delete_requests user_delete_requests_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_delete_requests
    ADD CONSTRAINT user_delete_requests_token_key UNIQUE (token);


--
-- Name: user_pw_reset_requests user_pw_reset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pw_reset_requests
    ADD CONSTRAINT user_pw_reset_requests_pkey PRIMARY KEY (id);


--
-- Name: user_pw_reset_requests user_pw_reset_requests_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pw_reset_requests
    ADD CONSTRAINT user_pw_reset_requests_token_key UNIQUE (token);


--
-- Name: user_tokens user_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_pkey PRIMARY KEY (id);


--
-- Name: user_tokens user_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_token_key UNIQUE (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_ratings_availability_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_availability_rating ON public.ratings USING btree (availability_rating);


--
-- Name: idx_ratings_cleanliness_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_cleanliness_rating ON public.ratings USING btree (cleanliness_rating);


--
-- Name: idx_ratings_parking_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_parking_space_id ON public.ratings USING btree (parking_space_id);


--
-- Name: idx_ratings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_user_id ON public.ratings USING btree (user_id);


--
-- Name: ratings trg_update_parking_space_ratings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_parking_space_ratings AFTER INSERT OR DELETE OR UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_parking_space_ratings();


--
-- Name: cars cars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: paid_parking_allowed_availability paid_parking_allowed_availability_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability
    ADD CONSTRAINT paid_parking_allowed_availability_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id);


--
-- Name: paid_parking_allowed_availability paid_parking_allowed_availability_parking_space_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability
    ADD CONSTRAINT paid_parking_allowed_availability_parking_space_id_fkey1 FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: parking_spaces parking_spaces_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces
    ADD CONSTRAINT parking_spaces_owner_fkey FOREIGN KEY (owner) REFERENCES public.users(id);


--
-- Name: ratings ratings_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_car_info_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_car_info_id_fkey FOREIGN KEY (car_info_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_renter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: timetable_coalesce timetable_coalesce_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_coalesce
    ADD CONSTRAINT timetable_coalesce_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: user_delete_requests user_delete_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_delete_requests
    ADD CONSTRAINT user_delete_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_pw_reset_requests user_pw_reset_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pw_reset_requests
    ADD CONSTRAINT user_pw_reset_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_tokens user_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

