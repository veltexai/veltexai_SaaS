import type { Geography } from "../../100A/src/types";

// A rotating national-market roster.  It intentionally uses metro labels rather than an
// unbounded nationwide text query so each source record remains attributable and deduplicable.
export const NATIONAL_CLEANING_MARKETS: readonly Geography[] = [
  ["new-york-ny", "New York, NY"], ["los-angeles-ca", "Los Angeles, CA"], ["chicago-il", "Chicago, IL"],
  ["dallas-tx", "Dallas, TX"], ["houston-tx", "Houston, TX"], ["phoenix-az", "Phoenix, AZ"],
  ["philadelphia-pa", "Philadelphia, PA"], ["san-antonio-tx", "San Antonio, TX"], ["san-diego-ca", "San Diego, CA"],
  ["san-jose-ca", "San Jose, CA"], ["austin-tx", "Austin, TX"], ["jacksonville-fl", "Jacksonville, FL"],
  ["fort-worth-tx", "Fort Worth, TX"], ["columbus-oh", "Columbus, OH"], ["charlotte-nc", "Charlotte, NC"],
  ["indianapolis-in", "Indianapolis, IN"], ["seattle-wa", "Seattle, WA"], ["denver-co", "Denver, CO"],
  ["washington-dc", "Washington, DC"], ["nashville-tn", "Nashville, TN"], ["oklahoma-city-ok", "Oklahoma City, OK"],
  ["el-paso-tx", "El Paso, TX"], ["las-vegas-nv", "Las Vegas, NV"], ["boston-ma", "Boston, MA"],
  ["portland-or", "Portland, OR"], ["detroit-mi", "Detroit, MI"], ["memphis-tn", "Memphis, TN"],
  ["louisville-ky", "Louisville, KY"], ["baltimore-md", "Baltimore, MD"], ["milwaukee-wi", "Milwaukee, WI"],
  ["albuquerque-nm", "Albuquerque, NM"], ["tucson-az", "Tucson, AZ"], ["fresno-ca", "Fresno, CA"],
  ["sacramento-ca", "Sacramento, CA"], ["kansas-city-mo", "Kansas City, MO"], ["mesa-az", "Mesa, AZ"],
  ["atlanta-ga", "Atlanta, GA"], ["omaha-ne", "Omaha, NE"], ["raleigh-nc", "Raleigh, NC"],
  ["miami-fl", "Miami, FL"], ["tampa-fl", "Tampa, FL"], ["orlando-fl", "Orlando, FL"],
  ["minneapolis-mn", "Minneapolis, MN"], ["cleveland-oh", "Cleveland, OH"], ["pittsburgh-pa", "Pittsburgh, PA"],
  ["cincinnati-oh", "Cincinnati, OH"], ["st-louis-mo", "St. Louis, MO"], ["new-orleans-la", "New Orleans, LA"],
  ["richmond-va", "Richmond, VA"], ["salt-lake-city-ut", "Salt Lake City, UT"], ["boise-id", "Boise, ID"],
].map(([id, label]) => ({ id, label }));

export function discoveryGeographies(mode: string | undefined): Geography[] {
  return mode === "nationwide" ? [...NATIONAL_CLEANING_MARKETS] : [{ id: "seattle-wa", label: "Seattle, WA" }];
}
