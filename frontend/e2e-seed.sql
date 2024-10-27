--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4 (Debian 16.4-1.pgdg110+2)
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: merge_ranges(tstzrange[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merge_ranges(tstzrange[]) RETURNS SETOF tstzrange
    LANGUAGE plpgsql
    AS $_$
declare
    t tstzrange;
    r tstzrange;
begin
    foreach t in array $1 loop
        if r && t then r:= r + t;
        else
            if r notnull then return next r;
            end if;
            r:= t;
        end if;
    end loop;
    if r notnull then return next r;
    end if;
end $_$;


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
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
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
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parking_space_id uuid NOT NULL,
    "time" tstzrange NOT NULL
);


--
-- Name: parking_spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parking_spaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner uuid NOT NULL,
    location public.geography(Point,4326),
    is_paid boolean DEFAULT false,
    name text,
    features text[],
    availability_schedule jsonb,
    pricing_info jsonb,
    photos text[],
    verification_status text,
    dynamic_pricing_enabled boolean DEFAULT false,
    cancellation_policy text,
    locked boolean DEFAULT false,
    locked_by uuid,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    address text
);


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parking_space_id uuid NOT NULL,
    renter_id uuid NOT NULL,
    car_info_id uuid NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'booked'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT reservations_check CHECK ((end_time > start_time))
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

COPY public.cars (id, user_id, make, model, license_plate, color, created_at, updated_at) FROM stdin;
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
\.


--
-- Data for Name: paid_parking_allowed_availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.paid_parking_allowed_availability (id, parking_space_id, "time") FROM stdin;
3dbd25a3-7423-4d35-9771-66e527ed3afa	1692f1d6-a67b-4659-a555-bdf22359bd24	["2024-10-26 23:47:05.717214+00","2024-10-27 00:47:05.717214+00")
d16c8e4d-39f4-4da8-9122-107308f624ca	1692f1d6-a67b-4659-a555-bdf22359bd24	["2024-10-27 00:17:28.045305+00","2024-10-27 01:47:28.045305+00")
808b495b-3c1b-4dda-a442-a355e7bec6e7	1692f1d6-a67b-4659-a555-bdf22359bd24	["2024-10-27 00:46:38.373398+00","2024-10-27 01:47:38.373398+00")
d4852d2d-3386-4735-ac12-5d6d735cad7c	1692f1d6-a67b-4659-a555-bdf22359bd24	["2024-10-27 01:45:55.148562+00","2024-10-27 02:47:55.148562+00")
b32235db-d1ee-4cd6-9428-6d7f0152d6bd	1692f1d6-a67b-4659-a555-bdf22359bd24	["2024-10-27 04:52:47.93917+00","2024-10-27 05:52:47.93917+00")
2367c46a-96e7-4f38-b84a-14d3e168e405	1692f1d6-a67b-4659-a555-bdf22359bd24	["2024-10-27 05:52:55.029553+00","2024-10-27 06:52:55.029553+00")
\.


--
-- Data for Name: parking_spaces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parking_spaces (id, owner, location, is_paid, name, features, availability_schedule, pricing_info, photos, verification_status, dynamic_pricing_enabled, cancellation_policy, locked, locked_by, locked_until, created_at, updated_at, address) FROM stdin;
1692f1d6-a67b-4659-a555-bdf22359bd24	22b98560-9e2e-4446-b807-7a9958d09043	0101000020E610000000000000000044400000000000004440	t	\N	\N	\N	\N	{}	pending	f	\N	f	\N	\N	2024-10-24 17:52:20.411763+00	2024-10-24 17:52:20.411763+00	address
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reservations (id, parking_space_id, renter_id, car_info_id, start_time, end_time, status, created_at, updated_at) FROM stdin;
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
\.


--
-- Data for Name: user_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_tokens (id, user_id, token, expiry) FROM stdin;
1	22b98560-9e2e-4446-b807-7a9958d09043	xpark_vB3jlMWVCl74YgMTSKyD4jNthfZOtojj6y6W5Tm8qhE	2024-11-23 17:44:11.853715
2	22b98560-9e2e-4446-b807-7a9958d09043	xpark_A_D6IHFBPK1zXNh-vOpZkEJ9iJU0dTKIu39dTU5X60k	2024-11-23 17:44:12.071758
3	22b98560-9e2e-4446-b807-7a9958d09043	xpark_I1w2GP3r4I0UCmqe_lTv6qRIRLHq2bNNqGWlPd4kcB0	2024-11-23 17:44:12.216084
4	22b98560-9e2e-4446-b807-7a9958d09043	xpark_bcTEwesUuLGfHrMTnZ5AyH6eAzyIeriW8eo8048yVOM	2024-11-23 17:44:12.30495
5	22b98560-9e2e-4446-b807-7a9958d09043	xpark_4ilCSgnPIlH_8kbYuO5-dpjAZwUJRNEdxR805EZ4oOg	2024-11-23 17:44:12.420581
6	22b98560-9e2e-4446-b807-7a9958d09043	xpark_ct_xmgQo5-uthUKOj-qiBCVFs5ELNGv11kDCa8rBldU	2024-11-23 17:44:12.637156
7	22b98560-9e2e-4446-b807-7a9958d09043	xpark_2qj-P1Tivhb-wEVY4M8WeHHhoHtv7EYl-hMmkz4XnOE	2024-11-23 17:44:12.799756
8	22b98560-9e2e-4446-b807-7a9958d09043	xpark_HhtkZDe9KD16mxKNH3xKLkNyFZUCthb2FLNG0srUFlE	2024-11-23 17:44:12.94288
9	22b98560-9e2e-4446-b807-7a9958d09043	xpark_KGZkJVX3ToRjZ_MWd4ucvP-qnYVdIddPxAHazofyuV0	2024-11-23 17:44:14.038523
10	22b98560-9e2e-4446-b807-7a9958d09043	xpark_HBCCy5x8KlPDTkqiHEc7tA_sVVcL-hAAVAXHBaVbJlw	2024-11-23 17:54:30.793847
11	22b98560-9e2e-4446-b807-7a9958d09043	xpark_oPTH0iaUWjyA4cSTN2H-iB13QbaNAQ1n021joFP6hWw	2024-11-23 17:54:30.890269
12	22b98560-9e2e-4446-b807-7a9958d09043	xpark_9gAgMiO3MZ9KntUZQyGBrDOGN9C5PVzwyUKtVsUtr8s	2024-11-23 17:54:31.042633
13	22b98560-9e2e-4446-b807-7a9958d09043	xpark_H6Z35WjP_JFGDzy7zDqnNg0hpF41Z4ZLD7iN_dVYBRU	2024-11-23 17:54:31.18412
14	22b98560-9e2e-4446-b807-7a9958d09043	xpark_O5fvYBpPIF1aevYXMCL4sbs7g40YBH5ZaicSUaFpDso	2024-11-23 17:54:31.308858
15	22b98560-9e2e-4446-b807-7a9958d09043	xpark__VuexA43zCE8xxY6jW6X5LTgoPl5N-dmgxOny5GmBto	2024-11-23 17:54:31.435483
16	22b98560-9e2e-4446-b807-7a9958d09043	xpark_jmT-DV9b2L1zAXTLrbRASS8fGANVCOEnPjXRdtorpW0	2024-11-23 17:54:31.585106
17	22b98560-9e2e-4446-b807-7a9958d09043	xpark_0KfaGAwYdzs2WAxdvPz5qBD5rN_XTxhdGpoPJDbEkdA	2024-11-23 17:54:31.740938
18	22b98560-9e2e-4446-b807-7a9958d09043	xpark_4Pgr0hPG2RtosOSXieb_FFFy7FxZzhQge6eY_vz0DrI	2024-11-23 17:54:31.880841
19	22b98560-9e2e-4446-b807-7a9958d09043	xpark_SAsK-oPL-Ma2G1e78BMeDfhpEIQgz8MAARsPJ4KNHtY	2024-11-23 17:57:13.636391
20	22b98560-9e2e-4446-b807-7a9958d09043	xpark_mtSckmQN-xPecFDWc33R294Hh2vETm7LhzuYJ_RjabE	2024-11-23 17:57:13.72358
21	22b98560-9e2e-4446-b807-7a9958d09043	xpark_LkXECCZ6X-gZre0bQ5U-PpH0noywZFhq8_xh0i8sTk8	2024-11-23 17:57:13.865818
22	22b98560-9e2e-4446-b807-7a9958d09043	xpark_sm8fGTk-ps-Eue0Buuze4PIkXStc1k10e9VouOSABE0	2024-11-23 17:57:14.000145
23	22b98560-9e2e-4446-b807-7a9958d09043	xpark_7d7cILcQSvjeCAePRp3XsoMi4ZlJO3qcr7YN8znU8cQ	2024-11-23 17:57:14.147773
24	22b98560-9e2e-4446-b807-7a9958d09043	xpark_EMOncVcWZ6LYMOtvlXQA1Afq_sW8PblLg_GEJW57TOE	2024-11-23 17:57:14.291509
25	22b98560-9e2e-4446-b807-7a9958d09043	xpark_kIsrdVRB5JmryDU7M7W0KXdtExV8g2aGmxHtuN7Fdb0	2024-11-23 17:57:14.443405
26	22b98560-9e2e-4446-b807-7a9958d09043	xpark_HKsjKhOrNQX1vFoVqAnm4RfpmjsSFlRpTbmIvmxyjtM	2024-11-23 17:57:14.594351
27	22b98560-9e2e-4446-b807-7a9958d09043	xpark_2gyrNQ1Url7Mj1WpAhWu9jDlvKZHxJpGX5bmD5l2eAo	2024-11-23 17:57:14.729018
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, deleted_at) FROM stdin;
22b98560-9e2e-4446-b807-7a9958d09043	name	testuser@example.com	$argon2id$v=19$m=65536,t=3,p=4$WSd7sJymKSnAzd7tA9WWKg$kxkx/qHJGt+0xf5XOetIUEoMW/4UCgmxdqdwGApN8lo	\N
\.


--
-- Name: timetable_coalesce_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timetable_coalesce_id_seq', 13, true);


--
-- Name: user_delete_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_delete_requests_id_seq', 1, false);


--
-- Name: user_pw_reset_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_pw_reset_requests_id_seq', 1, false);


--
-- Name: user_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_tokens_id_seq', 27, true);


--
-- Name: cars cars_license_plate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_license_plate_key UNIQUE (license_plate);


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
-- Name: parking_spaces parking_spaces_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces
    ADD CONSTRAINT parking_spaces_owner_fkey FOREIGN KEY (owner) REFERENCES public.users(id);


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

