CREATE OR REPLACE FUNCTION uppercase_client_fields() RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.full_name = UPPER(NEW.full_name); 
  NEW.address = UPPER(NEW.address); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS uppercase_client_fields_trigger ON clients;
CREATE TRIGGER uppercase_client_fields_trigger BEFORE INSERT OR UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION uppercase_client_fields();

CREATE OR REPLACE FUNCTION uppercase_vehicle_fields() RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.license_vin = UPPER(NEW.license_vin); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS uppercase_vehicle_fields_trigger ON vehicles;
CREATE TRIGGER uppercase_vehicle_fields_trigger BEFORE INSERT OR UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION uppercase_vehicle_fields();

CREATE OR REPLACE FUNCTION uppercase_org_fields() RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.org_name = UPPER(NEW.org_name); 
  NEW.address = UPPER(NEW.address); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS uppercase_org_fields_trigger ON organizations;
CREATE TRIGGER uppercase_org_fields_trigger BEFORE INSERT OR UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION uppercase_org_fields();

CREATE OR REPLACE FUNCTION uppercase_web_booking_fields() RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.full_name = UPPER(NEW.full_name); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS uppercase_web_booking_fields_trigger ON web_bookings;
CREATE TRIGGER uppercase_web_booking_fields_trigger BEFORE INSERT OR UPDATE ON web_bookings FOR EACH ROW EXECUTE FUNCTION uppercase_web_booking_fields();
